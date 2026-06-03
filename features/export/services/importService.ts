import {
  replaceCareLogTagsInTransaction,
  serializeCareLogTags,
} from "@/features/care-logs/services/careLogTagsService";
import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
} from "@/features/billing/constants";
import { downloadRemotePhotoAsset } from "@/features/plants/services/photoStorageService";
import { getEntitlementState } from "@/services/entitlementState";
import { getDatabase } from "@/services/database/sqlite";
import { insertSyncOutboxOperationInTransaction } from "@/services/database/syncOutbox";
import type {
  CareLog,
  CareReminder,
  GraveyardPlant,
  Photo,
  Plant,
  UserPreferences,
} from "@/types/models";
import { createId } from "@/utils/id";

export interface CollectionImportPayload {
  exportVersion: number;
  format: "json";
  preferences?: UserPreferences | null;
  plants: Partial<Plant>[];
  careLogs: Partial<CareLog>[];
  photos: Partial<Photo>[];
  reminders: Partial<CareReminder>[];
  memorialEntries: Partial<GraveyardPlant>[];
}

export interface CollectionImportSummary {
  plants: number;
  careLogs: number;
  photos: number;
  reminders: number;
  memorialEntries: number;
}

export function validateCollectionImportPayload(
  value: unknown,
): asserts value is CollectionImportPayload {
  if (!value || typeof value !== "object") {
    throw new Error("This is not a Conservatory export.");
  }

  const payload = value as Partial<CollectionImportPayload>;
  if (
    (payload.exportVersion !== 1 && payload.exportVersion !== 2) ||
    payload.format !== "json" ||
    !Array.isArray(payload.plants) ||
    !Array.isArray(payload.careLogs) ||
    !Array.isArray(payload.photos) ||
    !Array.isArray(payload.reminders) ||
    !Array.isArray(payload.memorialEntries)
  ) {
    throw new Error("This is not a Conservatory export.");
  }
}

export function previewCollectionImport(
  payload: CollectionImportPayload,
): CollectionImportSummary {
  validateCollectionImportPayload(payload);
  return {
    plants: payload.plants.length,
    careLogs: payload.careLogs.length,
    photos: payload.photos.length,
    reminders: payload.reminders.length,
    memorialEntries: payload.memorialEntries.length,
  };
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Import record is missing ${field}.`);
  }
  return value;
}

async function assertFreeImportQuotas(
  database: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
  payload: CollectionImportPayload,
) {
  const activePlantsInImport = payload.plants.filter(
    (plant) => !plant.status || plant.status === "active",
  );

  if (activePlantsInImport.length > 0) {
    const existingActiveRows = await database.getAllAsync<{ id: string }>(
      `SELECT id FROM plants WHERE user_id = ? AND status = 'active'`,
      userId,
    );
    const projectedActiveIds = new Set(
      existingActiveRows.map((row) => row.id),
    );

    for (const plant of activePlantsInImport) {
      if (typeof plant.id === "string" && plant.id.trim()) {
        projectedActiveIds.add(plant.id);
      }
    }

    if (projectedActiveIds.size > FREE_PLANT_LIMIT) {
      throw Object.assign(
        new Error(
          `Plant limit reached. Free accounts can hold up to ${FREE_PLANT_LIMIT} plants. Upgrade to Premium to import your full collection.`,
        ),
        {
          code: "PLANT_LIMIT_REACHED" as const,
          limit: FREE_PLANT_LIMIT,
          current: projectedActiveIds.size,
        },
      );
    }
  }

  const existingProgressRows = await database.getAllAsync<{
    id: string;
    plant_id: string;
  }>(
    `SELECT id, plant_id FROM photos
     WHERE user_id = ? AND photo_role = 'progress'`,
    userId,
  );
  const progressPhotoIdsByPlant = new Map<string, Set<string>>();

  for (const row of existingProgressRows) {
    const existing = progressPhotoIdsByPlant.get(row.plant_id) ?? new Set<string>();
    existing.add(row.id);
    progressPhotoIdsByPlant.set(row.plant_id, existing);
  }

  for (const photo of payload.photos) {
    const role =
      photo.photoRole ?? (photo.isPrimary ? "primary" : "progress");
    if (
      role !== "progress" ||
      typeof photo.id !== "string" ||
      typeof photo.plantId !== "string"
    ) {
      continue;
    }

    const existing =
      progressPhotoIdsByPlant.get(photo.plantId) ?? new Set<string>();
    existing.add(photo.id);
    progressPhotoIdsByPlant.set(photo.plantId, existing);
  }

  for (const [plantId, photoIds] of progressPhotoIdsByPlant) {
    if (photoIds.size > FREE_PROGRESS_PHOTOS_PER_PLANT) {
      throw Object.assign(
        new Error(
          `Photo limit reached for plant ${plantId}. Free accounts can keep up to ${FREE_PROGRESS_PHOTOS_PER_PLANT} progress photos per plant.`,
        ),
        {
          code: "PHOTO_LIMIT_REACHED" as const,
          limit: FREE_PROGRESS_PHOTOS_PER_PLANT,
          current: photoIds.size,
          plantId,
        },
      );
    }
  }
}

export async function restoreCollectionImport(input: {
  userId: string;
  payload: CollectionImportPayload;
}) {
  validateCollectionImportPayload(input.payload);
  const database = await getDatabase();
  const now = new Date().toISOString();
  const importRunId = createId("import");
  const summary = previewCollectionImport(input.payload);

  if (!getEntitlementState()) {
    await assertFreeImportQuotas(database, input.userId, input.payload);
  }

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO import_runs (
        id, user_id, source_version, status, summary, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      importRunId,
      input.userId,
      input.payload.exportVersion,
      "completed",
      JSON.stringify(summary),
      null,
      now,
      now,
    );

    for (const plant of input.payload.plants) {
      const id = requireString(plant.id, "plant id");
      await database.runAsync(
        `INSERT OR REPLACE INTO plants (
          id, user_id, name, species_name, nickname, status, location,
          watering_interval_days, last_watered_at, next_water_due_at, notes,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.userId,
        plant.name ?? "Imported specimen",
        plant.speciesName ?? "Unknown species",
        plant.nickname ?? null,
        plant.status ?? "active",
        plant.location ?? null,
        plant.wateringIntervalDays ?? 7,
        plant.lastWateredAt ?? null,
        plant.nextWaterDueAt ?? null,
        plant.notes ?? null,
        plant.createdAt ?? now,
        now,
        input.userId,
        1,
        null,
        null,
      );
      await insertSyncOutboxOperationInTransaction(database, {
        nowIso: now,
        operation: {
          entity: "plants",
          entityId: id,
          operation: "update",
          payload: { userId: input.userId, source: "import" },
        },
      });
    }

    for (const photo of input.payload.photos) {
      const id = requireString(photo.id, "photo id");
      const plantId = requireString(photo.plantId, "photo plant id");
      const role =
        photo.photoRole ?? (photo.isPrimary ? "primary" : "progress");
      const remoteUri =
        photo.remoteUrl?.startsWith("http") ||
        photo.storagePath?.startsWith("http")
          ? (photo.remoteUrl ?? photo.storagePath ?? null)
          : null;
      const restored =
        remoteUri
          ? await downloadRemotePhotoAsset({
              remoteUri,
              userId: input.userId,
              plantId,
              photoId: id,
              role,
              mimeType: photo.mimeType ?? "image/jpeg",
              storagePath: photo.storagePath ?? null,
            }).catch(() => null)
          : null;
      await database.runAsync(
        `INSERT OR REPLACE INTO photos (
          id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type,
          width, height, photo_role, captured_at, taken_at, caption, is_primary,
          created_at, updated_at, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.userId,
        plantId,
        restored?.localUri ?? photo.localUri ?? null,
        photo.remoteUrl ?? null,
        restored?.storagePath ?? photo.storagePath ?? null,
        photo.mimeType ?? "image/jpeg",
        photo.width ?? null,
        photo.height ?? null,
        role,
        photo.capturedAt ?? photo.takenAt ?? photo.createdAt ?? now,
        photo.takenAt ?? null,
        photo.caption ?? null,
        photo.isPrimary ?? 0,
        photo.createdAt ?? now,
        now,
        1,
        null,
        null,
      );
      await insertSyncOutboxOperationInTransaction(database, {
        nowIso: now,
        operation: {
          entity: "photos",
          entityId: id,
          operation: "update",
          payload: { userId: input.userId, source: "import" },
        },
      });
    }

    for (const log of input.payload.careLogs) {
      const id = requireString(log.id, "care log id");
      const plantId = requireString(log.plantId, "care log plant id");
      await database.runAsync(
        `INSERT OR REPLACE INTO care_logs (
          id, user_id, plant_id, log_type, current_condition, notes, tags,
          logged_at, created_at, updated_at, updated_by, pending, synced_at,
          sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.userId,
        plantId,
        log.logType ?? "note",
        log.currentCondition ?? null,
        log.notes ?? null,
        serializeCareLogTags(log.tags ?? []),
        log.loggedAt ?? now,
        log.createdAt ?? now,
        now,
        input.userId,
        1,
        null,
        null,
      );
      await replaceCareLogTagsInTransaction(database, {
        userId: input.userId,
        plantId,
        careLogId: id,
        tags: log.tags ?? [],
        nowIso: now,
        queueSync: true,
      });
      await insertSyncOutboxOperationInTransaction(database, {
        nowIso: now,
        operation: {
          entity: "care_logs",
          entityId: id,
          operation: "update",
          payload: { userId: input.userId, source: "import" },
        },
      });
    }

    for (const reminder of input.payload.reminders) {
      const id = requireString(reminder.id, "reminder id");
      const plantId = requireString(reminder.plantId, "reminder plant id");
      await database.runAsync(
        `INSERT OR REPLACE INTO care_reminders (
          id, user_id, plant_id, reminder_type, frequency_days, enabled,
          next_due_at, last_triggered_at, notification_id, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.userId,
        plantId,
        reminder.reminderType ?? "water",
        reminder.frequencyDays ?? 7,
        reminder.enabled ?? 1,
        reminder.nextDueAt ?? null,
        reminder.lastTriggeredAt ?? null,
        null,
        reminder.createdAt ?? now,
        now,
        input.userId,
        1,
        null,
        null,
      );
      await insertSyncOutboxOperationInTransaction(database, {
        nowIso: now,
        operation: {
          entity: "care_reminders",
          entityId: id,
          operation: "update",
          payload: { userId: input.userId, source: "import" },
        },
      });
    }

    for (const memorial of input.payload.memorialEntries) {
      const id = requireString(memorial.id, "memorial id");
      const plantId = requireString(memorial.plantId, "memorial plant id");
      await database.runAsync(
        `INSERT OR REPLACE INTO graveyard_plants (
          id, user_id, plant_id, cause_of_passing, memorial_note, archived_at,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.userId,
        plantId,
        memorial.causeOfPassing ?? null,
        memorial.memorialNote ?? null,
        memorial.archivedAt ?? now,
        memorial.createdAt ?? now,
        now,
        input.userId,
        1,
        null,
        null,
      );
      await insertSyncOutboxOperationInTransaction(database, {
        nowIso: now,
        operation: {
          entity: "graveyard_plants",
          entityId: id,
          operation: "update",
          payload: { userId: input.userId, source: "import" },
        },
      });
    }
  });

  return { importRunId, summary };
}

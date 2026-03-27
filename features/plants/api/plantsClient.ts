import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { cancelReminderNotification } from "@/features/notifications/services/notificationService";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { getDatabase } from "@/services/database/sqlite";
import {
  insertSyncOutboxOperationInTransaction,
  runAtomicMutationWithSyncOutbox,
} from "@/services/database/syncOutbox";
import { getStorageAssetUrl } from "@/services/supabase/storage";
import type {
  CareLog,
  CareReminder,
  CareLogCondition,
  CareLogType,
  GraveyardPlant,
  Photo,
  Plant,
  PlantWithRelations,
} from "@/types/models";
import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";
import { createId } from "@/utils/id";

import { derivePlantStatus } from "../services/plantStatusService";

async function queueSyncDeleteInTransaction(
  database: Awaited<ReturnType<typeof getDatabase>>,
  input: {
    entity: string;
    entityId: string;
    payload: Record<string, unknown>;
    nowIso: string;
  },
) {
  await insertSyncOutboxOperationInTransaction(database, {
    nowIso: input.nowIso,
    operation: {
      entity: input.entity,
      entityId: input.entityId,
      operation: "delete",
      payload: input.payload,
    },
  });
}

interface PlantRow {
  id: string;
  user_id: string;
  name: string;
  species_name: string;
  nickname: string | null;
  status: "active" | "graveyard";
  location: string | null;
  watering_interval_days: number;
  last_watered_at: string | null;
  next_water_due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface PhotoRow {
  id: string;
  user_id: string;
  plant_id: string;
  local_uri: string | null;
  remote_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  is_primary: number;
  created_at: string;
  updated_at: string;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface ReminderRow {
  id: string;
  user_id: string;
  plant_id: string;
  reminder_type: "water" | "mist" | "feed";
  frequency_days: number;
  enabled: number;
  next_due_at: string | null;
  last_triggered_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

function toPlant(row: PlantRow): Plant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    speciesName: row.species_name,
    nickname: row.nickname,
    status: row.status,
    location: row.location,
    wateringIntervalDays: row.watering_interval_days,
    lastWateredAt: row.last_watered_at,
    nextWaterDueAt: row.next_water_due_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    localUri: row.local_uri,
    remoteUrl: row.remote_url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    takenAt: row.taken_at,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function toReminder(row: ReminderRow): CareReminder {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    reminderType: row.reminder_type,
    frequencyDays: row.frequency_days,
    enabled: row.enabled,
    nextDueAt: row.next_due_at,
    lastTriggeredAt: row.last_triggered_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function mapCareLog(row: {
  id: string;
  user_id: string;
  plant_id: string;
  log_type: CareLogType;
  current_condition: CareLogCondition | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): CareLog {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    logType: row.log_type,
    currentCondition: row.current_condition,
    notes: row.notes,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function resolveRenderablePhotoUri(photo: Photo | undefined) {
  if (!photo) {
    return null;
  }

  if (photo.remoteUrl) {
    return photo.remoteUrl;
  }

  if (photo.localUri) {
    return photo.localUri;
  }

  return null;
}

function buildPhotoByPlantIdMap(rows: PhotoRow[]) {
  const photoByPlantId = new Map<string, Photo>();

  for (const row of rows) {
    if (!photoByPlantId.has(row.plant_id)) {
      photoByPlantId.set(row.plant_id, toPhoto(row));
    }
  }

  return photoByPlantId;
}

async function hydratePhotosForDisplay(rows: PhotoRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const resolvedRemoteUrl =
        row.remote_url ?? (await getStorageAssetUrl(row.storage_path)) ?? null;

      return toPhoto({
        ...row,
        remote_url: resolvedRemoteUrl,
      });
    }),
  );
}

function computeNextWaterDueAt(lastWateredAt: string, intervalDays: number) {
  const due = new Date(lastWateredAt);
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString();
}

function buildPhotoStoragePath(
  userId: string,
  plantId: string,
  photoId: string,
  localUri: string,
) {
  const normalizedUri = localUri.split("?")[0] ?? localUri;
  const extension =
    normalizedUri.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? "jpg";
  return `${userId}/${plantId}/${photoId}.${extension}`;
}

export interface GraveyardPlantListItem extends GraveyardPlant {
  name: string;
  speciesName: string;
  nickname?: string | null;
  plantNotes?: string | null;
  primaryPhotoUri?: string | null;
}

export interface PlantListItem extends Plant {
  primaryPhotoUri?: string | null;
}

export async function listGraveyardPlants(userId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    cause_of_passing: string | null;
    memorial_note: string | null;
    archived_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
    name: string;
    species_name: string;
    nickname: string | null;
    notes: string | null;
  }>(
    `SELECT gp.*, p.name, p.species_name, p.nickname, p.notes
     FROM graveyard_plants gp
     INNER JOIN plants p ON p.id = gp.plant_id
     WHERE gp.user_id = ?
     ORDER BY gp.archived_at DESC;`,
    userId,
  );

  const photos = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE user_id = ?
     ORDER BY is_primary DESC, updated_at DESC, created_at DESC;`,
    userId,
  );
  const hydratedPhotos = await hydratePhotosForDisplay(photos);
  const photoByPlantId = buildPhotoByPlantIdMap(
    hydratedPhotos.map((photo) => ({
      id: photo.id,
      user_id: photo.userId,
      plant_id: photo.plantId,
      local_uri: photo.localUri ?? null,
      remote_url: photo.remoteUrl ?? null,
      storage_path: photo.storagePath ?? null,
      mime_type: photo.mimeType ?? null,
      width: photo.width ?? null,
      height: photo.height ?? null,
      taken_at: photo.takenAt ?? null,
      is_primary: photo.isPrimary,
      created_at: photo.createdAt,
      updated_at: photo.updatedAt,
      pending: photo.pending,
      synced_at: photo.syncedAt ?? null,
      sync_error: photo.syncError ?? null,
    })),
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    causeOfPassing: row.cause_of_passing,
    memorialNote: row.memorial_note,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
    name: row.name,
    speciesName: row.species_name,
    nickname: row.nickname,
    plantNotes: row.notes,
    primaryPhotoUri: resolveRenderablePhotoUri(
      photoByPlantId.get(row.plant_id),
    ),
  }));
}

export async function listPlants(input: {
  userId: string;
  filter: PlantLibraryFilter;
  sort: PlantSortOption;
  query: string;
}) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<PlantRow>(
    "SELECT * FROM plants WHERE user_id = ? AND status = ? ORDER BY updated_at DESC;",
    input.userId,
    "active",
  );
  const photos = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE user_id = ?
     ORDER BY is_primary DESC, updated_at DESC, created_at DESC;`,
    input.userId,
  );
  const reminders = await database.getAllAsync<ReminderRow>(
    `SELECT * FROM care_reminders
     WHERE user_id = ?
     ORDER BY next_due_at ASC, updated_at DESC;`,
    input.userId,
  );
  const logs = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type: CareLogType;
    current_condition: CareLogCondition | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(
    `SELECT * FROM care_logs
     WHERE user_id = ?
     ORDER BY logged_at DESC;`,
    input.userId,
  );
  const hydratedPhotos = await hydratePhotosForDisplay(photos);
  const photoByPlantId = buildPhotoByPlantIdMap(
    hydratedPhotos.map((photo) => ({
      id: photo.id,
      user_id: photo.userId,
      plant_id: photo.plantId,
      local_uri: photo.localUri ?? null,
      remote_url: photo.remoteUrl ?? null,
      storage_path: photo.storagePath ?? null,
      mime_type: photo.mimeType ?? null,
      width: photo.width ?? null,
      height: photo.height ?? null,
      taken_at: photo.takenAt ?? null,
      is_primary: photo.isPrimary,
      created_at: photo.createdAt,
      updated_at: photo.updatedAt,
      pending: photo.pending,
      synced_at: photo.syncedAt ?? null,
      sync_error: photo.syncError ?? null,
    })),
  );
  const remindersByPlantId = new Map<string, CareReminder[]>();
  for (const reminder of reminders.map(toReminder)) {
    const existing = remindersByPlantId.get(reminder.plantId) ?? [];
    existing.push(reminder);
    remindersByPlantId.set(reminder.plantId, existing);
  }

  const logsByPlantId = new Map<string, ReturnType<typeof mapCareLog>[]>();
  for (const log of logs.map(mapCareLog)) {
    const existing = logsByPlantId.get(log.plantId) ?? [];
    existing.push(log);
    logsByPlantId.set(log.plantId, existing);
  }
  const lowerQuery = input.query.trim().toLowerCase();
  const filtered = rows
    .map((row) => {
      const plant = toPlant(row);
      const listItem = {
        ...plant,
        primaryPhotoUri: resolveRenderablePhotoUri(
          photoByPlantId.get(plant.id),
        ),
      } satisfies PlantListItem;

      return {
        plant: listItem,
        status: derivePlantStatus({
          plant: listItem,
          reminders: remindersByPlantId.get(plant.id) ?? [],
          logs: logsByPlantId.get(plant.id) ?? [],
        }),
      };
    })
    .filter(({ plant, status }) => {
      if (input.filter === "needs-water") {
        return status.isDue || status.isOverdue;
      }

      if (input.filter === "thriving") {
        return status.healthState === "thriving";
      }

      if (input.filter === "recently-watered") {
        return status.isRecentlyWatered;
      }

      if (input.filter === "with-notes") {
        return Boolean(plant.notes?.trim());
      }

      if (input.filter === "unplaced") {
        return !plant.location?.trim();
      }

      return true;
    })
    .filter(({ plant }) => {
      if (!lowerQuery) {
        return true;
      }

      return `${plant.name} ${plant.speciesName} ${plant.nickname ?? ""}`
        .toLowerCase()
        .includes(lowerQuery);
    });

  return filtered
    .sort((left, right) => {
    if (input.sort === "name") {
        return left.plant.name.localeCompare(right.plant.name);
    }
    if (input.sort === "water-due") {
        const leftDue = left.status.effectiveNextWateringDate ?? "";
        const rightDue = right.status.effectiveNextWateringDate ?? "";

        if (leftDue !== rightDue) {
          return leftDue.localeCompare(rightDue);
        }

        return left.plant.name.localeCompare(right.plant.name);
    }
      return right.plant.updatedAt.localeCompare(left.plant.updatedAt);
    })
    .map((item) => item.plant);
}

export async function getPlantById(
  userId: string,
  plantId: string,
): Promise<PlantWithRelations | null> {
  const database = await getDatabase();
  const plantRow = await database.getFirstAsync<PlantRow>(
    "SELECT * FROM plants WHERE user_id = ? AND id = ? LIMIT 1;",
    userId,
    plantId,
  );

  if (!plantRow) {
    return null;
  }

  const photos = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE plant_id = ?
     ORDER BY is_primary DESC, updated_at DESC, created_at DESC;`,
    plantId,
  );
  const hydratedPhotos = await hydratePhotosForDisplay(photos);
  const reminders = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    reminder_type: "water" | "mist" | "feed";
    frequency_days: number;
    enabled: number;
    next_due_at: string | null;
    last_triggered_at: string | null;
    notification_id: string | null;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(
    "SELECT * FROM care_reminders WHERE plant_id = ? ORDER BY created_at DESC;",
    plantId,
  );
  const logs = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type: CareLogType;
    current_condition: CareLogCondition | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(
    "SELECT * FROM care_logs WHERE plant_id = ? ORDER BY logged_at DESC;",
    plantId,
  );

  return {
    plant: toPlant(plantRow),
    photos: hydratedPhotos,
    reminders: reminders.map((row) => ({
      id: row.id,
      userId: row.user_id,
      plantId: row.plant_id,
      reminderType: row.reminder_type,
      frequencyDays: row.frequency_days,
      enabled: row.enabled,
      nextDueAt: row.next_due_at,
      lastTriggeredAt: row.last_triggered_at,
      notificationId: row.notification_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      pending: row.pending,
      syncedAt: row.synced_at,
      syncError: row.sync_error,
    })),
    logs: logs.map((row) => ({
      id: row.id,
      userId: row.user_id,
      plantId: row.plant_id,
      logType: row.log_type,
      currentCondition: row.current_condition,
      notes: row.notes,
      loggedAt: row.logged_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      pending: row.pending,
      syncedAt: row.synced_at,
      syncError: row.sync_error,
    })),
  };
}

export async function createPlant(input: {
  userId: string;
  name: string;
  speciesName: string;
  nickname?: string;
  location?: string;
  wateringIntervalDays: number;
  notes?: string;
  photoUri?: string;
}) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const plantId = createId("plant");
  const preferences = await getUserPreferences(input.userId);
  const nextWaterDueAt = optimizeReminderTiming({
    plantName: input.name,
    speciesName: input.speciesName,
    wateringIntervalDays: input.wateringIntervalDays,
    nextDueAt: computeNextWaterDueAt(now, input.wateringIntervalDays),
    lastWateredAt: now,
    reminderEnabled: true,
    defaultWateringHour: preferences.defaultWateringHour,
  }).nextDueAt;

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO plants (
          id, user_id, name, species_name, nickname, status, location, watering_interval_days,
          last_watered_at, next_water_due_at, notes, created_at, updated_at, updated_by,
          pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        plantId,
        input.userId,
        input.name,
        input.speciesName,
        input.nickname ?? null,
        "active",
        input.location ?? null,
        input.wateringIntervalDays,
        transactionNowIso,
        nextWaterDueAt,
        input.notes ?? null,
        transactionNowIso,
        transactionNowIso,
        input.userId,
        1,
        null,
        null,
      );

      const operations: {
        entity: string;
        entityId: string;
        operation: "insert" | "update" | "delete";
        payload?: Record<string, unknown>;
      }[] = [
        {
          entity: "plants",
          entityId: plantId,
          operation: "insert",
          payload: {
            userId: input.userId,
            name: input.name,
            speciesName: input.speciesName,
          },
        },
      ];

      if (input.photoUri) {
        const photoId = createId("photo");
        const storagePath = buildPhotoStoragePath(
          input.userId,
          plantId,
          photoId,
          input.photoUri,
        );
        await database.runAsync(
          `INSERT INTO photos (
            id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
            taken_at, is_primary, created_at, updated_at, pending, synced_at, sync_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          photoId,
          input.userId,
          plantId,
          input.photoUri,
          null,
          storagePath,
          "image/jpeg",
          null,
          null,
          transactionNowIso,
          1,
          transactionNowIso,
          transactionNowIso,
          1,
          null,
          null,
        );

        operations.push({
          entity: "photos",
          entityId: photoId,
          operation: "insert",
          payload: {
            userId: input.userId,
            plantId,
          },
        });
      }

      return {
        result: plantId,
        operations,
      };
    },
  });

  await upsertReminder({
    userId: input.userId,
    plantId,
    frequencyDays: input.wateringIntervalDays,
    nextDueAt: nextWaterDueAt,
    enabled: true,
  });

  const created = await getPlantById(input.userId, plantId);
  return created!;
}

export async function addPlantProgressPhoto(input: {
  userId: string;
  plantId: string;
  photoUri: string;
}) {
  const database = await getDatabase();
  const current = await getPlantById(input.userId, input.plantId);
  if (!current) {
    throw new Error("Plant not found.");
  }

  const now = new Date().toISOString();
  const photoId = createId("photo");
  const storagePath = buildPhotoStoragePath(
    input.userId,
    input.plantId,
    photoId,
    input.photoUri,
  );

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO photos (
          id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
          taken_at, is_primary, created_at, updated_at, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        photoId,
        input.userId,
        input.plantId,
        input.photoUri,
        null,
        storagePath,
        "image/jpeg",
        null,
        null,
        transactionNowIso,
        0,
        transactionNowIso,
        transactionNowIso,
        1,
        null,
        null,
      );

      return {
        result: photoId,
        operations: [
          {
            entity: "photos",
            entityId: photoId,
            operation: "insert",
            payload: {
              userId: input.userId,
              plantId: input.plantId,
            },
          },
        ],
      };
    },
  });

  return (await getPlantById(input.userId, input.plantId))!;
}

export async function updatePlant(input: {
  userId: string;
  plantId: string;
  patch: {
    name: string;
    speciesName: string;
    nickname?: string;
    location?: string;
    wateringIntervalDays: number;
    notes?: string;
    photoUri?: string;
  };
}) {
  const database = await getDatabase();
  const current = await getPlantById(input.userId, input.plantId);
  if (!current) {
    throw new Error("Plant not found.");
  }

  const updatedAt = new Date().toISOString();
  const preferences = await getUserPreferences(input.userId);
  const nextWaterSeed = current.plant.lastWateredAt
    ? computeNextWaterDueAt(
        current.plant.lastWateredAt,
        input.patch.wateringIntervalDays,
      )
    : (current.plant.nextWaterDueAt ?? null);
  const nextWaterDueAt = optimizeReminderTiming({
    plantName: input.patch.name,
    speciesName: input.patch.speciesName,
    wateringIntervalDays: input.patch.wateringIntervalDays,
    nextDueAt: nextWaterSeed,
    lastWateredAt: current.plant.lastWateredAt ?? null,
    reminderEnabled: true,
    lastTriggeredAt: current.reminders[0]?.lastTriggeredAt ?? null,
    defaultWateringHour: preferences.defaultWateringHour,
  }).nextDueAt;

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: updatedAt,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE plants
         SET name = ?, species_name = ?, nickname = ?, location = ?, watering_interval_days = ?,
             notes = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, pending = 1
         WHERE id = ?;`,
        input.patch.name,
        input.patch.speciesName,
        input.patch.nickname ?? null,
        input.patch.location ?? null,
        input.patch.wateringIntervalDays,
        input.patch.notes ?? null,
        nextWaterDueAt,
        transactionNowIso,
        input.userId,
        input.plantId,
      );

      const operations: {
        entity: string;
        entityId: string;
        operation: "insert" | "update" | "delete";
        payload?: Record<string, unknown>;
      }[] = [];

      if (input.patch.photoUri) {
        const existingPhoto = current.photos.find(
          (photo) => photo.isPrimary === 1,
        );
        if (existingPhoto) {
          const storagePath =
            existingPhoto.storagePath ??
            buildPhotoStoragePath(
              input.userId,
              input.plantId,
              existingPhoto.id,
              input.patch.photoUri,
            );
          await database.runAsync(
            "UPDATE photos SET local_uri = ?, remote_url = ?, storage_path = ?, mime_type = ?, updated_at = ?, pending = 1 WHERE id = ?;",
            input.patch.photoUri,
            null,
            storagePath,
            "image/jpeg",
            transactionNowIso,
            existingPhoto.id,
          );

          operations.push({
            entity: "photos",
            entityId: existingPhoto.id,
            operation: "update",
            payload: {
              userId: input.userId,
              plantId: input.plantId,
            },
          });
        } else {
          const photoId = createId("photo");
          const storagePath = buildPhotoStoragePath(
            input.userId,
            input.plantId,
            photoId,
            input.patch.photoUri,
          );
          await database.runAsync(
            `INSERT INTO photos (
              id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
              taken_at, is_primary, created_at, updated_at, pending, synced_at, sync_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            photoId,
            input.userId,
            input.plantId,
            input.patch.photoUri,
            null,
            storagePath,
            "image/jpeg",
            null,
            null,
            transactionNowIso,
            1,
            transactionNowIso,
            transactionNowIso,
            1,
            null,
            null,
          );

          operations.push({
            entity: "photos",
            entityId: photoId,
            operation: "insert",
            payload: {
              userId: input.userId,
              plantId: input.plantId,
            },
          });
        }
      }

      operations.push({
        entity: "plants",
        entityId: input.plantId,
        operation: "update",
        payload: {
          userId: input.userId,
          patch: {
            name: input.patch.name,
            speciesName: input.patch.speciesName,
            wateringIntervalDays: input.patch.wateringIntervalDays,
          },
        },
      });

      return {
        result: input.plantId,
        operations,
      };
    },
  });

  await upsertReminder({
    userId: input.userId,
    plantId: input.plantId,
    frequencyDays: input.patch.wateringIntervalDays,
    nextDueAt: nextWaterDueAt ?? null,
    enabled: true,
  });

  const updated = await getPlantById(input.userId, input.plantId);
  return updated!;
}

export async function deletePlant(userId: string, plantId: string) {
  const database = await getDatabase();
  const queueTimestamp = new Date().toISOString();
  const photos = await database.getAllAsync<{
    id: string;
    storage_path: string | null;
  }>("SELECT id, storage_path FROM photos WHERE plant_id = ?;", plantId);
  const graveyardRecords = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM graveyard_plants WHERE plant_id = ?;",
    plantId,
  );
  const logs = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM care_logs WHERE plant_id = ?;",
    plantId,
  );
  const reminders = await database.getAllAsync<{
    id: string;
    notification_id: string | null;
  }>(
    "SELECT id, notification_id FROM care_reminders WHERE plant_id = ?;",
    plantId,
  );

  for (const reminder of reminders) {
    await cancelReminderNotification(reminder.notification_id);
  }

  await database.withTransactionAsync(async () => {
    for (const photo of photos) {
      await queueSyncDeleteInTransaction(database, {
        entity: "photos",
        entityId: photo.id,
        payload: {
          userId,
          plantId,
          storagePath: photo.storage_path,
        },
        nowIso: queueTimestamp,
      });
    }

    for (const graveyardRecord of graveyardRecords) {
      await queueSyncDeleteInTransaction(database, {
        entity: "graveyard_plants",
        entityId: graveyardRecord.id,
        payload: {
          userId,
          plantId,
        },
        nowIso: queueTimestamp,
      });
    }

    for (const log of logs) {
      await queueSyncDeleteInTransaction(database, {
        entity: "care_logs",
        entityId: log.id,
        payload: {
          userId,
          plantId,
        },
        nowIso: queueTimestamp,
      });
    }

    for (const reminder of reminders) {
      await queueSyncDeleteInTransaction(database, {
        entity: "care_reminders",
        entityId: reminder.id,
        payload: {
          userId,
          plantId,
        },
        nowIso: queueTimestamp,
      });
    }

    await queueSyncDeleteInTransaction(database, {
      entity: "plants",
      entityId: plantId,
      payload: { userId },
      nowIso: queueTimestamp,
    });

    await database.runAsync("DELETE FROM photos WHERE plant_id = ?;", plantId);
    await database.runAsync(
      "DELETE FROM graveyard_plants WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM care_logs WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM care_reminders WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM plants WHERE id = ? AND user_id = ?;",
      plantId,
      userId,
    );
  });
}

export async function archivePlant(input: {
  userId: string;
  plantId: string;
  causeOfPassing?: string;
  memorialNote?: string;
}) {
  const database = await getDatabase();
  const plant = await getPlantById(input.userId, input.plantId);
  if (!plant) {
    throw new Error("Plant not found.");
  }

  const now = new Date().toISOString();
  const existingArchive = await database.getFirstAsync<{ id: string }>(
    "SELECT id FROM graveyard_plants WHERE plant_id = ? LIMIT 1;",
    input.plantId,
  );
  const reminders = await database.getAllAsync<{
    id: string;
    notification_id: string | null;
  }>(
    "SELECT id, notification_id FROM care_reminders WHERE plant_id = ?;",
    input.plantId,
  );
  const graveyardId = existingArchive?.id ?? createId("graveyard");
  const reminderIds = reminders.map((reminder) => reminder.id);

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE plants
         SET status = 'graveyard', updated_at = ?, updated_by = ?, pending = 1
         WHERE id = ? AND user_id = ?;`,
        transactionNowIso,
        input.userId,
        input.plantId,
        input.userId,
      );

      await database.runAsync(
        `UPDATE care_reminders
         SET enabled = 0, next_due_at = NULL, notification_id = NULL, updated_at = ?, updated_by = ?, pending = 1
         WHERE plant_id = ?;`,
        transactionNowIso,
        input.userId,
        input.plantId,
      );

      if (existingArchive) {
        await database.runAsync(
          `UPDATE graveyard_plants
           SET cause_of_passing = ?, memorial_note = ?, archived_at = ?, updated_at = ?, updated_by = ?, pending = 1
           WHERE id = ?;`,
          input.causeOfPassing ?? null,
          input.memorialNote ?? plant.plant.notes ?? null,
          transactionNowIso,
          transactionNowIso,
          input.userId,
          graveyardId,
        );
      } else {
        await database.runAsync(
          `INSERT INTO graveyard_plants (
            id, user_id, plant_id, cause_of_passing, memorial_note, archived_at, created_at, updated_at, updated_by,
            pending, synced_at, sync_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          graveyardId,
          input.userId,
          input.plantId,
          input.causeOfPassing ?? null,
          input.memorialNote ?? plant.plant.notes ?? null,
          transactionNowIso,
          transactionNowIso,
          transactionNowIso,
          input.userId,
          1,
          null,
          null,
        );
      }

      return {
        result: graveyardId,
        operations: [
          ...reminderIds.map((reminderId) => ({
            entity: "care_reminders",
            entityId: reminderId,
            operation: "update" as const,
            payload: {
              userId: input.userId,
              plantId: input.plantId,
              enabled: false,
            },
          })),
          {
            entity: "plants",
            entityId: input.plantId,
            operation: "update" as const,
            payload: {
              userId: input.userId,
              status: "graveyard",
            },
          },
          {
            entity: "graveyard_plants",
            entityId: graveyardId,
            operation: existingArchive ? "update" : ("insert" as const),
            payload: {
              userId: input.userId,
              plantId: input.plantId,
            },
          },
        ],
      };
    },
  });

  for (const reminder of reminders) {
    await cancelReminderNotification(reminder.notification_id);
  }

  return graveyardId;
}

export async function updateGraveyardMemorial(input: {
  userId: string;
  graveyardId: string;
  causeOfPassing?: string;
  memorialNote?: string;
}) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{
    id: string;
    plant_id: string;
  }>(
    "SELECT id, plant_id FROM graveyard_plants WHERE id = ? AND user_id = ? LIMIT 1;",
    input.graveyardId,
    input.userId,
  );

  if (!existing) {
    throw new Error("Memorial entry not found.");
  }

  const updatedAt = new Date().toISOString();

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: updatedAt,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE graveyard_plants
         SET cause_of_passing = ?, memorial_note = ?, updated_at = ?, updated_by = ?, pending = 1
         WHERE id = ?;`,
        input.causeOfPassing?.trim() || null,
        input.memorialNote?.trim() || null,
        transactionNowIso,
        input.userId,
        input.graveyardId,
      );

      return {
        result: input.graveyardId,
        operations: [
          {
            entity: "graveyard_plants",
            entityId: input.graveyardId,
            operation: "update" as const,
            payload: {
              userId: input.userId,
              plantId: existing.plant_id,
            },
          },
        ],
      };
    },
  });

  const updated = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    cause_of_passing: string | null;
    memorial_note: string | null;
    archived_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>("SELECT * FROM graveyard_plants WHERE id = ? LIMIT 1;", input.graveyardId);

  return {
    id: updated!.id,
    userId: updated!.user_id,
    plantId: updated!.plant_id,
    causeOfPassing: updated!.cause_of_passing,
    memorialNote: updated!.memorial_note,
    archivedAt: updated!.archived_at,
    createdAt: updated!.created_at,
    updatedAt: updated!.updated_at,
    updatedBy: updated!.updated_by,
    pending: updated!.pending,
    syncedAt: updated!.synced_at,
    syncError: updated!.sync_error,
  } satisfies GraveyardPlant;
}

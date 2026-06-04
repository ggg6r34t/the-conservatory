import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
} from "@/features/billing/constants";
import { upsertReminderInTransaction } from "@/features/notifications/api/remindersClient";
import { cancelReminderNotification } from "@/features/notifications/services/notificationService";
import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { getDatabase } from "@/services/database/sqlite";
import {
  insertSyncOutboxOperationInTransaction,
  runAtomicMutationWithSyncOutbox,
  terminalizePendingUpsertSyncQueueInTransaction,
  terminalizePendingUpsertSyncQueueItemsInTransaction,
} from "@/services/database/syncOutbox";
import { notifySyncQueueChanged } from "@/services/database/syncSignals";
import { getStorageAssetUrl } from "@/services/supabase/storage";
import type {
  CareLog,
  CareLogCondition,
  CareLogType,
  CareReminder,
  ReminderType,
  GraveyardPlant,
  Photo,
  Plant,
  PlantWithRelations,
} from "@/types/models";
import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";
import {
  comparePlantsForAdvancedFilter,
  isPremiumLibraryFilter,
  resolvePlantLibraryFilter,
} from "@/features/plants/services/plantLibraryFilterService";
import { createId } from "@/utils/id";
import {
  trackGtmEvent,
  trackMonetizationEvent,
} from "@/services/analytics/analyticsService";
import { logger } from "@/utils/logger";

import {
  managedPhotoFileExists,
  persistPhotoAsset,
} from "../services/photoStorageService";
import {
  buildPrimaryPhotoListFields,
  resolvePhotoDisplayUri,
  resolvePrimaryPlantPhoto,
  resolveRenderablePhotoUri,
  type PrimaryPhotoSummaryFields,
} from "../services/plantPhotoResolver";

export type { PrimaryPhotoSummaryFields };
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
  photo_role: "primary" | "progress" | null;
  captured_at: string | null;
  taken_at: string | null;
  caption: string | null;
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
  reminder_type: ReminderType;
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
    photoRole:
      row.photo_role ?? (row.is_primary === 1 ? "primary" : "progress"),
    capturedAt: row.captured_at,
    takenAt: row.taken_at,
    caption: row.caption,
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

function buildPhotoByPlantIdMap(rows: PhotoRow[]) {
  return buildPhotoByPlantIdMapFromPhotos(rows.map(toPhoto));
}

function buildPhotoByPlantIdMapFromPhotos(photos: Photo[]) {
  const photosByPlantId = new Map<string, Photo[]>();

  for (const photo of photos) {
    const existing = photosByPlantId.get(photo.plantId) ?? [];
    existing.push(photo);
    photosByPlantId.set(photo.plantId, existing);
  }

  const photoByPlantId = new Map<string, Photo>();

  for (const [plantId, plantPhotos] of photosByPlantId) {
    const primary = resolvePrimaryPlantPhoto(plantPhotos);
    if (primary) {
      photoByPlantId.set(plantId, primary);
    }
  }

  return photoByPlantId;
}

function isHttpOrFileUri(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("file:") ||
    value.startsWith("content:")
  );
}

async function resolvePhotoRowForDisplay(row: PhotoRow): Promise<PhotoRow> {
  let local_uri = row.local_uri;
  if (local_uri && !(await managedPhotoFileExists(local_uri))) {
    local_uri = null;
  }

  let remote_url = row.remote_url;
  const hasLocalUri = Boolean(local_uri?.trim());
  const needsStorageSignedUrl =
    Boolean(row.storage_path) &&
    (!hasLocalUri ||
      !remote_url ||
      !isHttpOrFileUri(remote_url));
  const storageBacked = needsStorageSignedUrl
    ? await getStorageAssetUrl(row.storage_path)
    : null;

  if (!hasLocalUri) {
    remote_url = storageBacked ?? remote_url;
  } else if (remote_url && !isHttpOrFileUri(remote_url)) {
    remote_url = storageBacked ?? remote_url;
  }

  if (
    remote_url &&
    !isHttpOrFileUri(remote_url) &&
    storageBacked
  ) {
    remote_url = storageBacked;
  }

  return {
    ...row,
    local_uri,
    remote_url,
  };
}

function attachPrimaryPhotoFields(photo: Photo | undefined) {
  return buildPrimaryPhotoListFields(photo, { context: "card" });
}

async function hydratePhotosForDisplay(rows: PhotoRow[]) {
  return Promise.all(
    rows.map(async (row) => toPhoto(await resolvePhotoRowForDisplay(row))),
  );
}

function computeNextWaterDueAt(lastWateredAt: string, intervalDays: number) {
  const due = new Date(lastWateredAt);
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString();
}

export interface GraveyardPlantListItem
  extends GraveyardPlant,
    PrimaryPhotoSummaryFields {
  name: string;
  speciesName: string;
  nickname?: string | null;
  plantNotes?: string | null;
  photoCount: number;
  careLogCount: number;
  hasPrimaryPhoto: boolean;
}

export interface PlantListItem extends Plant, PrimaryPhotoSummaryFields {}

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
     WHERE gp.user_id = ? AND p.status = 'graveyard'
     ORDER BY gp.archived_at DESC;`,
    userId,
  );

  const photos = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE user_id = ?
     ORDER BY is_primary DESC, updated_at DESC, created_at DESC;`,
    userId,
  );
  const careLogCounts = await database.getAllAsync<{
    plant_id: string;
    total: number;
  }>(
    `SELECT plant_id, COUNT(*) AS total
     FROM care_logs
     WHERE user_id = ?
     GROUP BY plant_id;`,
    userId,
  );
  const hydratedPhotos = await hydratePhotosForDisplay(photos);
  const photoByPlantId = buildPhotoByPlantIdMapFromPhotos(hydratedPhotos);
  const photoCountByPlantId = new Map<string, number>();
  const hasPrimaryPhotoByPlantId = new Map<string, boolean>();

  for (const photo of hydratedPhotos) {
    if (!resolveRenderablePhotoUri(photo)) {
      continue;
    }

    photoCountByPlantId.set(
      photo.plantId,
      (photoCountByPlantId.get(photo.plantId) ?? 0) + 1,
    );

    if (photo.isPrimary === 1) {
      hasPrimaryPhotoByPlantId.set(photo.plantId, true);
    }
  }

  const careLogCountByPlantId = new Map(
    careLogCounts.map((row) => [row.plant_id, row.total]),
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
    ...attachPrimaryPhotoFields(photoByPlantId.get(row.plant_id)),
    photoCount: photoCountByPlantId.get(row.plant_id) ?? 0,
    careLogCount: careLogCountByPlantId.get(row.plant_id) ?? 0,
    hasPrimaryPhoto: hasPrimaryPhotoByPlantId.get(row.plant_id) ?? false,
  }));
}

export async function listPlants(input: {
  userId: string;
  filter: PlantLibraryFilter;
  sort: PlantSortOption;
  query: string;
  isPremium?: boolean;
}) {
  const filter = resolvePlantLibraryFilter(
    input.filter,
    input.isPremium ?? false,
  );
  const database = await getDatabase();
  const rows = await database.getAllAsync<PlantRow>(
    "SELECT * FROM plants WHERE user_id = ? AND status = ? ORDER BY updated_at DESC;",
    input.userId,
    "active",
  );

  if (rows.length === 0) {
    return [];
  }

  const plantIds = rows.map((r) => r.id);
  const placeholders = plantIds.map(() => "?").join(", ");

  // Scope all queries to the exact plant IDs returned above — avoids loading
  // every photo/reminder/log for the user when only active plants are needed.
  const photos = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE plant_id IN (${placeholders})
     ORDER BY is_primary DESC, updated_at DESC, created_at DESC;`,
    ...plantIds,
  );
  const reminders = await database.getAllAsync<ReminderRow>(
    `SELECT * FROM care_reminders
     WHERE plant_id IN (${placeholders})
     ORDER BY next_due_at ASC, updated_at DESC;`,
    ...plantIds,
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
     WHERE plant_id IN (${placeholders})
     ORDER BY logged_at DESC
     LIMIT 500;`, /* 500 total across all plants — not per-plant; safe because
       derivePlantStatus() only needs the most-recent water log, which is always
       within the first 500 rows when ordered DESC. plant.last_watered_at is
       also updated atomically as a fallback so truncation is harmless. */
    ...plantIds,
  );

  const hydratedPhotos = await hydratePhotosForDisplay(photos);
  const photoByPlantId = buildPhotoByPlantIdMapFromPhotos(hydratedPhotos);
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
        ...attachPrimaryPhotoFields(photoByPlantId.get(plant.id)),
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
      if (filter === "needs-water") {
        return status.isDue || status.isOverdue;
      }

      if (filter === "thriving") {
        return status.healthState === "thriving";
      }

      if (filter === "recently-watered") {
        return status.isRecentlyWatered;
      }

      if (filter === "with-notes") {
        return Boolean(plant.notes?.trim());
      }

      if (filter === "unplaced") {
        return !plant.location?.trim();
      }

      if (isPremiumLibraryFilter(filter)) {
        return true;
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
      if (isPremiumLibraryFilter(filter)) {
        return comparePlantsForAdvancedFilter(left.plant, right.plant, filter);
      }

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

export async function listPhotosForPlants(input: {
  userId: string;
  plantIds: string[];
  sinceCapturedAt?: string;
}) {
  if (!input.plantIds.length) {
    return [] as Photo[];
  }

  const database = await getDatabase();
  const uniquePlantIds = [...new Set(input.plantIds)];
  const placeholders = uniquePlantIds.map(() => "?").join(", ");
  const sinceClause = input.sinceCapturedAt
    ? ` AND COALESCE(captured_at, taken_at, created_at) >= ?`
    : "";
  const params = input.sinceCapturedAt
    ? [input.userId, ...uniquePlantIds, input.sinceCapturedAt]
    : [input.userId, ...uniquePlantIds];
  const rows = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos
     WHERE user_id = ?
       AND plant_id IN (${placeholders})${sinceClause}
     ORDER BY created_at DESC;`,
    ...params,
  );

  return hydratePhotosForDisplay(rows);
}

export async function getPlantById(
  userId: string,
  plantId: string,
  options?: { careLogSinceLoggedAt?: string },
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
    reminder_type: ReminderType;
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
  const logSql = options?.careLogSinceLoggedAt
    ? "SELECT * FROM care_logs WHERE plant_id = ? AND logged_at >= ? ORDER BY logged_at DESC;"
    : "SELECT * FROM care_logs WHERE plant_id = ? ORDER BY logged_at DESC;";
  const logParams = options?.careLogSinceLoggedAt
    ? [plantId, options.careLogSinceLoggedAt]
    : [plantId];
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
  }>(logSql, ...logParams);

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
  isPremium: boolean;
  name: string;
  speciesName: string;
  nickname?: string;
  location?: string;
  wateringIntervalDays: number;
  notes?: string;
  photoUri?: string;
  photoCapturedAt?: string;
  photoMimeType?: string;
  photoWidth?: number | null;
  photoHeight?: number | null;
}) {
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plants WHERE user_id = ? AND status = 'active'`,
    [input.userId],
  );
  const activePlantCount = countRow?.count ?? 0;

  if (!input.isPremium) {
    if (activePlantCount >= FREE_PLANT_LIMIT) {
      throw Object.assign(new Error('Plant limit reached'), {
        code: 'PLANT_LIMIT_REACHED' as const,
        limit: FREE_PLANT_LIMIT,
        current: activePlantCount,
      });
    }
  }
  if (input.wateringIntervalDays < 1 || input.wateringIntervalDays > 60) {
    throw new Error("Watering interval must be between 1 and 60 days.");
  }
  const database = await getDatabase();
  const now = new Date().toISOString();
  const plantId = createId("plant");
  const preferences = await getUserPreferences(input.userId);
  const primaryPhotoId = input.photoUri ? createId("photo") : null;
  const primaryPhoto =
    input.photoUri && primaryPhotoId
      ? {
          id: primaryPhotoId,
          ...(await persistPhotoAsset({
            sourceUri: input.photoUri,
            userId: input.userId,
            plantId,
            photoId: primaryPhotoId,
            role: "primary",
            mimeType: input.photoMimeType ?? "image/jpeg",
          })),
        }
      : null;
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

      if (primaryPhoto) {
        await database.runAsync(
          `INSERT INTO photos (
            id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
            photo_role, captured_at, taken_at, caption, is_primary, created_at, updated_at, pending, synced_at, sync_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          primaryPhoto.id,
          input.userId,
          plantId,
          primaryPhoto.localUri,
          null,
          primaryPhoto.storagePath,
          input.photoMimeType ?? "image/jpeg",
          input.photoWidth ?? null,
          input.photoHeight ?? null,
          "primary",
          input.photoCapturedAt ?? transactionNowIso,
          transactionNowIso,
          null,
          1,
          transactionNowIso,
          transactionNowIso,
          1,
          null,
          null,
        );

        operations.push({
          entity: "photos",
          entityId: primaryPhoto.id,
          operation: "insert",
          payload: {
            userId: input.userId,
            plantId,
          },
        });
      }

      const { reminderId, operation: reminderOp } =
        await upsertReminderInTransaction(database, transactionNowIso, {
          userId: input.userId,
          plantId,
          frequencyDays: input.wateringIntervalDays,
          nextDueAt: nextWaterDueAt,
          enabled: preferences.remindersEnabled,
        });

      operations.push({
        entity: "care_reminders",
        entityId: reminderId,
        operation: reminderOp,
        payload: {
          userId: input.userId,
          plantId,
          frequencyDays: input.wateringIntervalDays,
          enabled: preferences.remindersEnabled,
        },
      });

      return {
        result: plantId,
        operations,
      };
    },
  });

  const created = await getPlantById(input.userId, plantId);
  if (created) {
    const reminder = created.reminders[0];
    if (reminder?.enabled) {
      void reschedulePlantReminder(reminder, created.plant.name).catch(
        (error) => {
          const message =
            error instanceof Error ? error.message : "unknown";
          logger.warn("plants.reminder_schedule_failed", {
            plantId,
            error: message,
          });
          trackMonetizationEvent("reminder_schedule_failed", {
            plantId,
            source: "create_plant",
            error: message,
          });
        },
      );
    }
  }

  if (activePlantCount === 0) {
    trackGtmEvent("activation_first_plant_created");
  }

  return created!;
}

export async function addPlantProgressPhoto(input: {
  userId: string;
  plantId: string;
  photoUri: string;
  capturedAt?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  isPremium?: boolean;
}) {
  const database = await getDatabase();
  const current = await getPlantById(input.userId, input.plantId);
  if (!current) {
    throw new Error("Plant not found.");
  }

  if (!input.isPremium) {
    const photoCountRow = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos WHERE plant_id = ? AND user_id = ? AND photo_role = 'progress'`,
      [input.plantId, input.userId],
    );
    const currentCount = photoCountRow?.count ?? 0;
    if (currentCount >= FREE_PROGRESS_PHOTOS_PER_PLANT) {
      throw Object.assign(new Error("Photo limit reached"), {
        code: "PHOTO_LIMIT_REACHED" as const,
        limit: FREE_PROGRESS_PHOTOS_PER_PLANT,
        current: currentCount,
      });
    }
  }

  const now = new Date().toISOString();
  const photoId = createId("photo");
  const persistedPhoto = await persistPhotoAsset({
    sourceUri: input.photoUri,
    userId: input.userId,
    plantId: input.plantId,
    photoId,
    role: "progress",
    mimeType: input.mimeType ?? "image/jpeg",
  });

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO photos (
          id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
          photo_role, captured_at, taken_at, caption, is_primary, created_at, updated_at, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        photoId,
        input.userId,
        input.plantId,
        persistedPhoto.localUri,
        null,
        persistedPhoto.storagePath,
        input.mimeType ?? "image/jpeg",
        input.width ?? null,
        input.height ?? null,
        "progress",
        input.capturedAt ?? transactionNowIso,
        transactionNowIso,
        input.caption?.trim() || null,
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
    photoCapturedAt?: string;
    photoMimeType?: string;
    photoWidth?: number | null;
    photoHeight?: number | null;
  };
}) {
  if (
    input.patch.wateringIntervalDays < 1 ||
    input.patch.wateringIntervalDays > 60
  ) {
    throw new Error("Watering interval must be between 1 and 60 days.");
  }
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
          const persistedPhoto = await persistPhotoAsset({
            sourceUri: input.patch.photoUri,
            userId: input.userId,
            plantId: input.plantId,
            photoId: existingPhoto.id,
            role: "primary",
            mimeType: input.patch.photoMimeType ?? "image/jpeg",
          });
          await database.runAsync(
            "UPDATE photos SET local_uri = ?, remote_url = ?, storage_path = ?, mime_type = ?, width = ?, height = ?, photo_role = ?, captured_at = COALESCE(?, captured_at), updated_at = ?, pending = 1 WHERE id = ?;",
            persistedPhoto.localUri,
            null,
            persistedPhoto.storagePath,
            input.patch.photoMimeType ?? "image/jpeg",
            input.patch.photoWidth ?? null,
            input.patch.photoHeight ?? null,
            "primary",
            input.patch.photoCapturedAt ?? null,
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
          const persistedPhoto = await persistPhotoAsset({
            sourceUri: input.patch.photoUri,
            userId: input.userId,
            plantId: input.plantId,
            photoId,
            role: "primary",
            mimeType: input.patch.photoMimeType ?? "image/jpeg",
          });
          await database.runAsync(
            `INSERT INTO photos (
              id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
              photo_role, captured_at, taken_at, caption, is_primary, created_at, updated_at, pending, synced_at, sync_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            photoId,
            input.userId,
            input.plantId,
            persistedPhoto.localUri,
            null,
            persistedPhoto.storagePath,
            input.patch.photoMimeType ?? "image/jpeg",
            input.patch.photoWidth ?? null,
            input.patch.photoHeight ?? null,
            "primary",
            input.patch.photoCapturedAt ?? transactionNowIso,
            transactionNowIso,
            null,
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

      const { reminderId, operation: reminderOp } =
        await upsertReminderInTransaction(database, transactionNowIso, {
          userId: input.userId,
          plantId: input.plantId,
          frequencyDays: input.patch.wateringIntervalDays,
          nextDueAt: nextWaterDueAt ?? null,
          enabled: preferences.remindersEnabled,
        });

      operations.push({
        entity: "care_reminders",
        entityId: reminderId,
        operation: reminderOp,
        payload: {
          userId: input.userId,
          plantId: input.plantId,
          frequencyDays: input.patch.wateringIntervalDays,
          enabled: preferences.remindersEnabled,
        },
      });

      return {
        result: input.plantId,
        operations,
      };
    },
  });

  const updated = await getPlantById(input.userId, input.plantId);
  if (updated) {
    const reminder = updated.reminders[0];
    if (reminder?.enabled) {
      void reschedulePlantReminder(reminder, updated.plant.name).catch(
        (error) => {
          const message =
            error instanceof Error ? error.message : "unknown";
          logger.warn("plants.reminder_schedule_failed", {
            plantId: input.plantId,
            error: message,
          });
          trackMonetizationEvent("reminder_schedule_failed", {
            plantId: input.plantId,
            source: "update_plant",
            error: message,
          });
        },
      );
    }
  }
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
  const careLogTags = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM care_log_tags WHERE plant_id = ?;",
    plantId,
  );
  const reminders = await database.getAllAsync<{
    id: string;
    notification_id: string | null;
  }>(
    "SELECT id, notification_id FROM care_reminders WHERE plant_id = ?;",
    plantId,
  );
  const statusSnapshots = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM plant_status_snapshots WHERE plant_id = ?;",
    plantId,
  );
  const specimenTags = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM specimen_tags WHERE plant_id = ?;",
    plantId,
  );
  const archiveOverrides = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM archive_curation_overrides WHERE plant_id = ?;",
    plantId,
  );
  const scheduleSuggestions = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM care_schedule_suggestions WHERE plant_id = ?;",
    plantId,
  );

  for (const reminder of reminders) {
    await cancelReminderNotification(reminder.notification_id);
  }

  await database.withTransactionAsync(async () => {
    await terminalizePendingUpsertSyncQueueInTransaction(database, {
      entity: "plants",
      entityId: plantId,
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "photos",
      entityIds: photos.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "graveyard_plants",
      entityIds: graveyardRecords.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "care_logs",
      entityIds: logs.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "care_log_tags",
      entityIds: careLogTags.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "care_reminders",
      entityIds: reminders.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "plant_status_snapshots",
      entityIds: statusSnapshots.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "specimen_tags",
      entityIds: specimenTags.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "archive_curation_overrides",
      entityIds: archiveOverrides.map((row) => row.id),
      nowIso: queueTimestamp,
    });
    await terminalizePendingUpsertSyncQueueItemsInTransaction(database, {
      entity: "care_schedule_suggestions",
      entityIds: scheduleSuggestions.map((row) => row.id),
      nowIso: queueTimestamp,
    });

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

    for (const tag of careLogTags) {
      await queueSyncDeleteInTransaction(database, {
        entity: "care_log_tags",
        entityId: tag.id,
        payload: { userId, plantId },
        nowIso: queueTimestamp,
      });
    }

    for (const snapshot of statusSnapshots) {
      await queueSyncDeleteInTransaction(database, {
        entity: "plant_status_snapshots",
        entityId: snapshot.id,
        payload: { userId, plantId },
        nowIso: queueTimestamp,
      });
    }

    for (const tag of specimenTags) {
      await queueSyncDeleteInTransaction(database, {
        entity: "specimen_tags",
        entityId: tag.id,
        payload: { userId, plantId },
        nowIso: queueTimestamp,
      });
    }

    for (const override of archiveOverrides) {
      await queueSyncDeleteInTransaction(database, {
        entity: "archive_curation_overrides",
        entityId: override.id,
        payload: { userId, plantId },
        nowIso: queueTimestamp,
      });
    }

    for (const suggestion of scheduleSuggestions) {
      await queueSyncDeleteInTransaction(database, {
        entity: "care_schedule_suggestions",
        entityId: suggestion.id,
        payload: { userId, plantId },
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
      "DELETE FROM care_log_tags WHERE plant_id = ?;",
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
      "DELETE FROM plant_status_snapshots WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM specimen_tags WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM archive_curation_overrides WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM care_schedule_suggestions WHERE plant_id = ?;",
      plantId,
    );
    await database.runAsync(
      "DELETE FROM plants WHERE id = ? AND user_id = ?;",
      plantId,
      userId,
    );
  });

  notifySyncQueueChanged();
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

export async function restorePlantFromGraveyard(input: {
  userId: string;
  plantId: string;
  isPremium: boolean;
}) {
  const database = await getDatabase();
  const plant = await getPlantById(input.userId, input.plantId);
  if (!plant) {
    throw new Error("Plant not found.");
  }

  if (plant.plant.status !== "graveyard") {
    throw new Error("Only archived plants can be restored to your collection.");
  }

  if (!input.isPremium) {
    const row = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM plants WHERE user_id = ? AND status = 'active'`,
      [input.userId],
    );
    const current = row?.count ?? 0;
    if (current >= FREE_PLANT_LIMIT) {
      throw Object.assign(new Error("Plant limit reached"), {
        code: "PLANT_LIMIT_REACHED" as const,
        limit: FREE_PLANT_LIMIT,
        current,
      });
    }
  }

  const graveyardRow = await database.getFirstAsync<{ id: string }>(
    "SELECT id FROM graveyard_plants WHERE plant_id = ? AND user_id = ? LIMIT 1;",
    input.plantId,
    input.userId,
  );

  if (!graveyardRow) {
    throw new Error("Memorial entry not found for this plant.");
  }

  const now = new Date().toISOString();

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE plants
         SET status = 'active', updated_at = ?, updated_by = ?, pending = 1
         WHERE id = ? AND user_id = ?;`,
        transactionNowIso,
        input.userId,
        input.plantId,
        input.userId,
      );

      await database.runAsync(
        "DELETE FROM graveyard_plants WHERE id = ? AND user_id = ?;",
        graveyardRow.id,
        input.userId,
      );

      return {
        result: input.plantId,
        operations: [
          {
            entity: "plants",
            entityId: input.plantId,
            operation: "update" as const,
            payload: {
              userId: input.userId,
              status: "active",
            },
          },
          {
            entity: "graveyard_plants",
            entityId: graveyardRow.id,
            operation: "delete" as const,
            payload: {
              userId: input.userId,
              plantId: input.plantId,
            },
          },
        ],
      };
    },
  });

  return input.plantId;
}

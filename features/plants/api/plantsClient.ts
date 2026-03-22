import { STORAGE_BUCKET } from "@/config/constants";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { cancelReminderNotification } from "@/features/notifications/services/notificationService";
import { getDatabase } from "@/services/database/sqlite";
import { enqueueSyncOperation } from "@/services/database/sync";
import { getStorageAssetUrl } from "@/services/supabase/storage";
import type {
  GraveyardPlant,
  Photo,
  Plant,
  PlantWithRelations,
} from "@/types/models";
import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";
import { createId } from "@/utils/id";

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
    primaryPhotoUri: resolveRenderablePhotoUri(photoByPlantId.get(row.plant_id)),
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
  const lowerQuery = input.query.trim().toLowerCase();

  const filtered = rows
    .map((row) => {
      const plant = toPlant(row);
        return {
          ...plant,
          primaryPhotoUri: resolveRenderablePhotoUri(photoByPlantId.get(plant.id)),
        } satisfies PlantListItem;
    })
    .filter((plant) => {
      if (input.filter === "needs-water") {
        return plant.nextWaterDueAt
          ? new Date(plant.nextWaterDueAt).getTime() <= Date.now()
          : false;
      }

      if (input.filter === "thriving") {
        return plant.nextWaterDueAt
          ? new Date(plant.nextWaterDueAt).getTime() > Date.now()
          : true;
      }

      return true;
    })
    .filter((plant) => {
      if (!lowerQuery) {
        return true;
      }

      return `${plant.name} ${plant.speciesName} ${plant.nickname ?? ""}`
        .toLowerCase()
        .includes(lowerQuery);
    });

  return filtered.sort((left, right) => {
    if (input.sort === "name") {
      return left.name.localeCompare(right.name);
    }
    if (input.sort === "water-due") {
      return (left.nextWaterDueAt ?? "").localeCompare(
        right.nextWaterDueAt ?? "",
      );
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
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
    log_type: "water" | "mist" | "feed" | "prune" | "pest" | "note";
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
  const nextWaterDueAt = computeNextWaterDueAt(now, input.wateringIntervalDays);

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
    now,
    nextWaterDueAt,
    input.notes ?? null,
    now,
    now,
    input.userId,
    1,
    null,
    null,
  );

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
      now,
      1,
      now,
      now,
      1,
      null,
      null,
    );

    await enqueueSyncOperation({
      entity: "photos",
      entityId: photoId,
      operation: "insert",
      payload: {
        userId: input.userId,
        plantId,
      },
    });
  }

  await enqueueSyncOperation({
    entity: "plants",
    entityId: plantId,
    operation: "insert",
    payload: {
      userId: input.userId,
      name: input.name,
      speciesName: input.speciesName,
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
  const nextWaterDueAt = current.plant.lastWateredAt
    ? computeNextWaterDueAt(
        current.plant.lastWateredAt,
        input.patch.wateringIntervalDays,
      )
    : (current.plant.nextWaterDueAt ?? null);

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
    updatedAt,
    input.userId,
    input.plantId,
  );

  if (input.patch.photoUri) {
    const existingPhoto = current.photos.find((photo) => photo.isPrimary === 1);
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
        updatedAt,
        existingPhoto.id,
      );

      await enqueueSyncOperation({
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
        updatedAt,
        1,
        updatedAt,
        updatedAt,
        1,
        null,
        null,
      );

      await enqueueSyncOperation({
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

  await upsertReminder({
    userId: input.userId,
    plantId: input.plantId,
    frequencyDays: input.patch.wateringIntervalDays,
    nextDueAt: nextWaterDueAt ?? null,
    enabled: true,
  });

  await enqueueSyncOperation({
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

  const updated = await getPlantById(input.userId, input.plantId);
  return updated!;
}

export async function deletePlant(userId: string, plantId: string) {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
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

  await enqueueSyncOperation({
    entity: "plants",
    entityId: plantId,
    operation: "delete",
    payload: { userId },
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

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE plants
       SET status = 'graveyard', updated_at = ?, updated_by = ?, pending = 1
       WHERE id = ? AND user_id = ?;`,
      now,
      input.userId,
      input.plantId,
      input.userId,
    );

    await database.runAsync(
      `UPDATE care_reminders
       SET enabled = 0, next_due_at = NULL, notification_id = NULL, updated_at = ?, updated_by = ?, pending = 1
       WHERE plant_id = ?;`,
      now,
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
        now,
        now,
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
        now,
        now,
        now,
        input.userId,
        1,
        null,
        null,
      );
    }
  });

  for (const reminder of reminders) {
    await cancelReminderNotification(reminder.notification_id);
    await enqueueSyncOperation({
      entity: "care_reminders",
      entityId: reminder.id,
      operation: "update",
      payload: {
        userId: input.userId,
        plantId: input.plantId,
        enabled: false,
      },
    });
  }

  await enqueueSyncOperation({
    entity: "plants",
    entityId: input.plantId,
    operation: "update",
    payload: {
      userId: input.userId,
      status: "graveyard",
    },
  });

  await enqueueSyncOperation({
    entity: "graveyard_plants",
    entityId: graveyardId,
    operation: existingArchive ? "update" : "insert",
    payload: {
      userId: input.userId,
      plantId: input.plantId,
    },
  });

  return graveyardId;
}

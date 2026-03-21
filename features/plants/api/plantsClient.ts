import { queryKeys } from "@/config/constants";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { getDatabase } from "@/services/database/sqlite";
import { enqueueSyncOperation } from "@/services/database/sync";
import type { Photo, Plant, PlantWithRelations } from "@/types/models";
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

function computeNextWaterDueAt(lastWateredAt: string, intervalDays: number) {
  const due = new Date(lastWateredAt);
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString();
}

export interface PlantListItem extends Plant {
  primaryPhotoUri?: string | null;
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
    "SELECT * FROM photos WHERE user_id = ? AND is_primary = 1;",
    input.userId,
  );

  const photoByPlantId = new Map(
    photos.map((photo) => [photo.plant_id, toPhoto(photo)]),
  );
  const lowerQuery = input.query.trim().toLowerCase();

  const filtered = rows
    .map((row) => {
      const plant = toPlant(row);
      return {
        ...plant,
        primaryPhotoUri:
          photoByPlantId.get(plant.id)?.localUri ??
          photoByPlantId.get(plant.id)?.remoteUrl ??
          null,
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
    "SELECT * FROM photos WHERE plant_id = ? ORDER BY created_at DESC;",
    plantId,
  );
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
    photos: photos.map(toPhoto),
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
      null,
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
      await database.runAsync(
        "UPDATE photos SET local_uri = ?, updated_at = ?, pending = 1 WHERE id = ?;",
        input.patch.photoUri,
        updatedAt,
        existingPhoto.id,
      );
    } else {
      await database.runAsync(
        `INSERT INTO photos (
          id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, width, height,
          taken_at, is_primary, created_at, updated_at, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        createId("photo"),
        input.userId,
        input.plantId,
        input.patch.photoUri,
        null,
        null,
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

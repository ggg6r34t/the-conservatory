import type { SQLiteDatabase } from "expo-sqlite";

import { supabase } from "@/config/supabase";
import { resolveConflict } from "@/services/database/conflictResolver";
import { getDatabase } from "@/services/database/sqlite";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";
import type { CareLogCondition } from "@/types/models";
import { logger } from "@/utils/logger";

interface MergeableRemoteRow {
  id: string;
  updated_at: string;
}

interface LocalSyncRow {
  pending: number;
  updated_at: string;
}

interface RemotePlantRow extends MergeableRemoteRow {
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
  updated_by: string | null;
}

interface RemotePhotoRow extends MergeableRemoteRow {
  id: string;
  user_id: string;
  plant_id: string;
  remote_url?: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  is_primary: boolean;
  created_at: string;
}

interface RemoteCareLogRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  log_type:
    | "water"
    | "mist"
    | "feed"
    | "repot"
    | "prune"
    | "inspect"
    | "pest"
    | "note";
  current_condition: CareLogCondition | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  updated_by: string | null;
}

interface RemoteReminderRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  reminder_type: "water" | "mist" | "feed";
  frequency_days: number;
  enabled: boolean;
  next_due_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_by: string | null;
}

interface RemoteGraveyardRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  cause_of_passing: string | null;
  memorial_note: string | null;
  archived_at: string;
  created_at: string;
  updated_by: string | null;
}

async function fetchRemoteRows<T>(
  table: string,
  columns: string,
  userId: string,
) {
  if (!supabase) {
    return [] as T[];
  }

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as T[];
}

async function fetchRemoteRowsSafe<T>(
  table: string,
  columns: string,
  userId: string,
) {
  try {
    return {
      ok: true,
      rows: await fetchRemoteRows<T>(table, columns, userId),
    };
  } catch (error) {
    logger.warn("sync.remote_hydration.fetch_failed", {
      table,
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false,
      rows: [] as T[],
    };
  }
}

async function fetchRemotePhotos(userId: string) {
  return fetchRemoteRowsSafe<RemotePhotoRow>(
    "photos",
    [
      "id",
      "user_id",
      "plant_id",
      "storage_path",
      "mime_type",
      "width",
      "height",
      "taken_at",
      "is_primary",
      "created_at",
      "updated_at",
    ].join(", "),
    userId,
  );
}

async function shouldReplaceLocalRow(
  database: SQLiteDatabase,
  table: string,
  row: MergeableRemoteRow,
) {
  const localRow = await database.getFirstAsync<LocalSyncRow>(
    `SELECT pending, updated_at FROM ${table} WHERE id = ? LIMIT 1;`,
    row.id,
  );

  if (!localRow) {
    return true;
  }

  const result = resolveConflict({
    entity: table,
    entityId: row.id,
    strategy: "last-write-wins",
    localUpdatedAt: localRow.updated_at,
    remoteUpdatedAt: row.updated_at,
    localPending: localRow.pending === 1,
  });

  return result.winner === "remote";
}

async function reconcileRemoteDeletions(params: {
  database: SQLiteDatabase;
  table: string;
  userId: string;
  remoteIds: string[];
}) {
  const { database, table, userId, remoteIds } = params;

  if (remoteIds.length === 0) {
    await database.runAsync(
      `DELETE FROM ${table} WHERE user_id = ? AND pending = 0;`,
      userId,
    );
    return;
  }

  const placeholders = remoteIds.map(() => "?").join(", ");
  await database.runAsync(
    `DELETE FROM ${table}
     WHERE user_id = ?
       AND pending = 0
       AND id NOT IN (${placeholders});`,
    userId,
    ...remoteIds,
  );
}

export async function hydrateRemoteUserData(userId: string) {
  if (!supabase) {
    return;
  }

  const [
    plantsResult,
    photosResult,
    careLogsResult,
    remindersResult,
    graveyardResult,
  ] = await Promise.all([
    fetchRemoteRowsSafe<RemotePlantRow>(
      "plants",
      [
        "id",
        "user_id",
        "name",
        "species_name",
        "nickname",
        "status",
        "location",
        "watering_interval_days",
        "last_watered_at",
        "next_water_due_at",
        "notes",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemotePhotos(userId),
    fetchRemoteRowsSafe<RemoteCareLogRow>(
      "care_logs",
      [
        "id",
        "user_id",
        "plant_id",
        "log_type",
        "current_condition",
        "notes",
        "logged_at",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemoteReminderRow>(
      "care_reminders",
      [
        "id",
        "user_id",
        "plant_id",
        "reminder_type",
        "frequency_days",
        "enabled",
        "next_due_at",
        "last_triggered_at",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemoteGraveyardRow>(
      "graveyard_plants",
      [
        "id",
        "user_id",
        "plant_id",
        "cause_of_passing",
        "memorial_note",
        "archived_at",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
  ]);

  const plants = plantsResult.rows;
  const photos = photosResult.rows;
  const careLogs = careLogsResult.rows;
  const reminders = remindersResult.rows;
  const graveyardPlants = graveyardResult.rows;

  const hydratedPhotos = await Promise.all(
    photos.map(async (row) => {
      try {
        const directRemoteUrl = row.remote_url?.startsWith("http")
          ? row.remote_url
          : row.storage_path?.startsWith("http")
            ? row.storage_path
            : null;
        const normalizedStoragePath =
          normalizeStoragePath(row.storage_path) ??
          normalizeStoragePath(row.remote_url);
        const resolvedRemoteUrl =
          directRemoteUrl ?? (await getStorageAssetUrl(normalizedStoragePath));

        return {
          ...row,
          resolvedRemoteUrl,
          normalizedStoragePath,
        };
      } catch (error) {
        logger.warn("sync.remote_hydration.photo_url_failed", {
          photoId: row.id,
          userId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return {
          ...row,
          resolvedRemoteUrl: null,
          normalizedStoragePath:
            normalizeStoragePath(row.storage_path) ??
            normalizeStoragePath(row.remote_url),
        };
      }
    }),
  );

  const database = await getDatabase();
  const syncedAt = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    for (const row of plants) {
      if (!(await shouldReplaceLocalRow(database, "plants", row))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO plants (
          id, user_id, name, species_name, nickname, status, location,
          watering_interval_days, last_watered_at, next_water_due_at, notes,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        row.id,
        row.user_id,
        row.name,
        row.species_name,
        row.nickname,
        row.status,
        row.location,
        row.watering_interval_days,
        row.last_watered_at,
        row.next_water_due_at,
        row.notes,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of hydratedPhotos) {
      if (!(await shouldReplaceLocalRow(database, "photos", row))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO photos (
          id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type,
          width, height, taken_at, is_primary, created_at, updated_at, pending,
          synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        row.id,
        row.user_id,
        row.plant_id,
        null,
        row.resolvedRemoteUrl ?? null,
        row.normalizedStoragePath,
        row.mime_type,
        row.width,
        row.height,
        row.taken_at,
        row.is_primary ? 1 : 0,
        row.created_at,
        row.updated_at,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of careLogs) {
      if (!(await shouldReplaceLocalRow(database, "care_logs", row))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO care_logs (
          id, user_id, plant_id, log_type, current_condition, notes, logged_at, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        row.id,
        row.user_id,
        row.plant_id,
        row.log_type,
        row.current_condition,
        row.notes,
        row.logged_at,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of reminders) {
      if (!(await shouldReplaceLocalRow(database, "care_reminders", row))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO care_reminders (
          id, user_id, plant_id, reminder_type, frequency_days, enabled,
          next_due_at, last_triggered_at, notification_id, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        row.id,
        row.user_id,
        row.plant_id,
        row.reminder_type,
        row.frequency_days,
        row.enabled ? 1 : 0,
        row.next_due_at,
        row.last_triggered_at,
        null,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of graveyardPlants) {
      if (!(await shouldReplaceLocalRow(database, "graveyard_plants", row))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO graveyard_plants (
          id, user_id, plant_id, cause_of_passing, memorial_note, archived_at,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        row.id,
        row.user_id,
        row.plant_id,
        row.cause_of_passing,
        row.memorial_note,
        row.archived_at,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    if (photosResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "photos",
        userId,
        remoteIds: hydratedPhotos.map((row) => row.id),
      });
    }

    if (careLogsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "care_logs",
        userId,
        remoteIds: careLogs.map((row) => row.id),
      });
    }

    if (remindersResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "care_reminders",
        userId,
        remoteIds: reminders.map((row) => row.id),
      });
    }

    if (graveyardResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "graveyard_plants",
        userId,
        remoteIds: graveyardPlants.map((row) => row.id),
      });
    }

    if (plantsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "plants",
        userId,
        remoteIds: plants.map((row) => row.id),
      });
    }
  });
}

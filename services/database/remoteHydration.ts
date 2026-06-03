import type { SQLiteDatabase } from "expo-sqlite";

import { supabase } from "@/config/supabase";
import { downloadRemotePhotoAsset } from "@/features/plants/services/photoStorageService";
import {
  buildConflictTelemetryMeta,
  resolveConflict,
} from "@/services/database/conflictResolver";
import { getLocalEntityId } from "@/services/database/clientIdMapping";
import { getDatabase } from "@/services/database/sqlite";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";
import type { CareLogCondition } from "@/types/models";
import { logger } from "@/utils/logger";

interface MergeableRemoteRow {
  id: string;
  client_id?: string | null;
  updated_at: string;
}

function buildRemoteToLocalIdMap<T extends { id: string; client_id?: string | null }>(
  rows: T[],
) {
  return new Map(rows.map((row) => [row.id, getLocalEntityId(row)]));
}

interface LocalSyncRow {
  pending: number;
  updated_at: string;
}

interface ConflictLogMeta {
  entity: string;
  entityId: string;
  winner: "local" | "remote";
  conflictClass: "local-pending" | "remote-newer" | "local-newer-or-equal";
  clockSkewSuspected: boolean;
  source: "remote-hydration";
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

interface RemoteUserPreferencesRow {
  user_id: string;
  reminders_enabled: boolean;
  auto_sync_enabled: boolean;
  preferred_theme: "linen-light";
  timezone: string;
  default_watering_hour: number;
  created_at: string;
  updated_at: string;
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
  photo_role: "primary" | "progress" | null;
  captured_at: string | null;
  taken_at: string | null;
  caption: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
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
  tags: string | null;
  logged_at: string;
  created_at: string;
  updated_by: string | null;
}

interface RemoteCareLogTagRow extends MergeableRemoteRow {
  user_id: string;
  care_log_id: string;
  plant_id: string;
  tag: string;
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

interface RemoteStatusSnapshotRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  status: "thriving" | "stable" | "needs_water";
  reason: string | null;
  captured_at: string;
  created_at: string;
  updated_by: string | null;
}

interface RemoteSpecimenTagRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  code: string;
  payload: string;
  qr_matrix: string;
  created_at: string;
  updated_by: string | null;
}

interface RemoteArchiveOverrideRow extends MergeableRemoteRow {
  user_id: string;
  plant_id: string;
  before_photo_id: string;
  after_photo_id: string;
  caption: string | null;
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

interface RemoteUserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
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

async function fetchRemoteUserRowSafe(userId: string) {
  try {
    if (!supabase) {
      return { ok: true, rows: [] as RemoteUserRow[] };
    }

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, display_name, avatar_url, role, created_at, updated_at, updated_by",
      )
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, rows: (data ?? []) as RemoteUserRow[] };
  } catch (error) {
    logger.warn("sync.remote_hydration.fetch_failed", {
      table: "users",
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { ok: false, rows: [] as RemoteUserRow[] };
  }
}

async function fetchRemotePhotos(userId: string) {
  return fetchRemoteRowsSafe<RemotePhotoRow>(
    "photos",
    [
      "id",
      "client_id",
      "user_id",
      "plant_id",
      "remote_url",
      "storage_path",
      "mime_type",
      "width",
      "height",
      "photo_role",
      "captured_at",
      "taken_at",
      "caption",
      "is_primary",
      "created_at",
      "updated_at",
    ].join(", "),
    userId,
  );
}

function logRemoteHydrationConflict(meta: ConflictLogMeta) {
  const shouldLog =
    meta.winner === "remote" ||
    meta.conflictClass === "local-pending" ||
    meta.clockSkewSuspected;

  if (!shouldLog) {
    return;
  }

  logger.info("sync.conflict.observed", { ...meta });
}

async function shouldReplaceLocalUserPreferences(
  database: SQLiteDatabase,
  userId: string,
  row: RemoteUserPreferencesRow,
) {
  const localRow = await database.getFirstAsync<LocalSyncRow>(
    `SELECT pending, updated_at FROM user_preferences WHERE user_id = ? LIMIT 1;`,
    userId,
  );

  if (!localRow) {
    return true;
  }

  const result = resolveConflict({
    entity: "user_preferences",
    entityId: userId,
    strategy: "last-write-wins",
    localUpdatedAt: localRow.updated_at,
    remoteUpdatedAt: row.updated_at,
    localPending: localRow.pending === 1,
  });

  const telemetry = buildConflictTelemetryMeta({
    record: {
      entity: "user_preferences",
      entityId: userId,
      strategy: "last-write-wins",
      localUpdatedAt: localRow.updated_at,
      remoteUpdatedAt: row.updated_at,
      localPending: localRow.pending === 1,
    },
    result,
    source: "remote-hydration",
  });

  logRemoteHydrationConflict({
    entity: "user_preferences",
    entityId: userId,
    winner: result.winner,
    ...telemetry,
    source: "remote-hydration",
  });

  return result.winner === "remote";
}

async function shouldReplaceLocalUser(
  database: SQLiteDatabase,
  userId: string,
  remoteUpdatedAt: string,
) {
  const localRow = await database.getFirstAsync<{ updated_at: string }>(
    `SELECT updated_at FROM users WHERE id = ? LIMIT 1;`,
    userId,
  );

  if (!localRow) {
    return true;
  }

  return remoteUpdatedAt > localRow.updated_at;
}

async function shouldReplaceLocalRow(
  database: SQLiteDatabase,
  table: string,
  localEntityId: string,
  remoteUpdatedAt: string,
) {
  const localRow = await database.getFirstAsync<LocalSyncRow>(
    `SELECT pending, updated_at FROM ${table} WHERE id = ? LIMIT 1;`,
    localEntityId,
  );

  if (!localRow) {
    return true;
  }

  const result = resolveConflict({
    entity: table,
    entityId: localEntityId,
    strategy: "last-write-wins",
    localUpdatedAt: localRow.updated_at,
    remoteUpdatedAt,
    localPending: localRow.pending === 1,
  });

  const telemetry = buildConflictTelemetryMeta({
    record: {
      entity: table,
      entityId: localEntityId,
      strategy: "last-write-wins",
      localUpdatedAt: localRow.updated_at,
      remoteUpdatedAt,
      localPending: localRow.pending === 1,
    },
    result,
    source: "remote-hydration",
  });

  logRemoteHydrationConflict({
    entity: table,
    entityId: localEntityId,
    winner: result.winner,
    ...telemetry,
    source: "remote-hydration",
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
    preferencesResult,
    plantsResult,
    photosResult,
    careLogsResult,
    remindersResult,
    careLogTagsResult,
    statusSnapshotsResult,
    specimenTagsResult,
    archiveOverridesResult,
    graveyardResult,
    usersResult,
  ] = await Promise.all([
    fetchRemoteRowsSafe<RemoteUserPreferencesRow>(
      "user_preferences",
      [
        "user_id",
        "reminders_enabled",
        "auto_sync_enabled",
        "preferred_theme",
        "timezone",
        "default_watering_hour",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemotePlantRow>(
      "plants",
      [
        "id",
        "client_id",
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
        "client_id",
        "user_id",
        "plant_id",
        "log_type",
        "current_condition",
        "notes",
        "tags",
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
        "client_id",
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
    fetchRemoteRowsSafe<RemoteCareLogTagRow>(
      "care_log_tags",
      [
        "id",
        "client_id",
        "user_id",
        "care_log_id",
        "plant_id",
        "tag",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemoteStatusSnapshotRow>(
      "plant_status_snapshots",
      [
        "id",
        "client_id",
        "user_id",
        "plant_id",
        "status",
        "reason",
        "captured_at",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemoteSpecimenTagRow>(
      "specimen_tags",
      [
        "id",
        "client_id",
        "user_id",
        "plant_id",
        "code",
        "payload",
        "qr_matrix",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
    fetchRemoteRowsSafe<RemoteArchiveOverrideRow>(
      "archive_curation_overrides",
      [
        "id",
        "client_id",
        "user_id",
        "plant_id",
        "before_photo_id",
        "after_photo_id",
        "caption",
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
        "client_id",
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
    fetchRemoteUserRowSafe(userId),
  ]);

  const plants = plantsResult.rows;
  const preferences = preferencesResult.rows[0] ?? null;
  const photos = photosResult.rows;
  const careLogs = careLogsResult.rows;
  const reminders = remindersResult.rows;
  const careLogTags = careLogTagsResult.rows;
  const statusSnapshots = statusSnapshotsResult.rows;
  const specimenTags = specimenTagsResult.rows;
  const archiveOverrides = archiveOverridesResult.rows;
  const graveyardPlants = graveyardResult.rows;
  const remoteUser = usersResult.rows[0] ?? null;
  const plantIdByRemote = buildRemoteToLocalIdMap(plants);
  const careLogIdByRemote = buildRemoteToLocalIdMap(careLogs);
  const photoIdByRemote = buildRemoteToLocalIdMap(photos);

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
        const role = row.photo_role ?? (row.is_primary ? "primary" : "progress");
        const restored =
          resolvedRemoteUrl && normalizedStoragePath
            ? await downloadRemotePhotoAsset({
                remoteUri: resolvedRemoteUrl,
                userId: row.user_id,
                plantId: plantIdByRemote.get(row.plant_id) ?? row.plant_id,
                photoId: getLocalEntityId(row),
                role,
                mimeType: row.mime_type,
                storagePath: normalizedStoragePath,
              })
            : null;

        return {
          ...row,
          resolvedRemoteUrl,
          restoredLocalUri: restored?.localUri ?? null,
          normalizedStoragePath: restored?.storagePath ?? normalizedStoragePath,
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
          restoredLocalUri: null,
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
    if (
      remoteUser &&
      (await shouldReplaceLocalUser(database, userId, remoteUser.updated_at))
    ) {
      await database.runAsync(
        `INSERT OR REPLACE INTO users (
          id, email, display_name, avatar_url, role, created_at, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        remoteUser.id,
        remoteUser.email,
        remoteUser.display_name,
        remoteUser.avatar_url ?? null,
        remoteUser.role,
        remoteUser.created_at,
        remoteUser.updated_at,
        remoteUser.updated_by,
      );
    }

    if (
      preferences &&
      (await shouldReplaceLocalUserPreferences(database, userId, preferences))
    ) {
      await database.runAsync(
        `INSERT OR REPLACE INTO user_preferences (
          user_id, reminders_enabled, auto_sync_enabled, preferred_theme, timezone, default_watering_hour,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        preferences.user_id,
        preferences.reminders_enabled ? 1 : 0,
        preferences.auto_sync_enabled ? 1 : 0,
        preferences.preferred_theme,
        preferences.timezone,
        preferences.default_watering_hour,
        preferences.created_at,
        preferences.updated_at,
        preferences.updated_by ?? preferences.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of plants) {
      const localId = getLocalEntityId(row);
      if (!(await shouldReplaceLocalRow(database, "plants", localId, row.updated_at))) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO plants (
          id, remote_id, user_id, name, species_name, nickname, status, location,
          watering_interval_days, last_watered_at, next_water_due_at, notes,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
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
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "photos",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO photos (
          id, remote_id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type,
          width, height, photo_role, captured_at, taken_at, caption, is_primary, created_at, updated_at, pending,
          synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
        row.restoredLocalUri,
        row.resolvedRemoteUrl ?? null,
        row.normalizedStoragePath,
        row.mime_type,
        row.width,
        row.height,
        row.photo_role ?? (row.is_primary ? "primary" : "progress"),
        row.captured_at ?? row.taken_at ?? row.created_at,
        row.taken_at,
        row.caption ?? null,
        row.is_primary ? 1 : 0,
        row.created_at,
        row.updated_at,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of careLogs) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "care_logs",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO care_logs (
          id, remote_id, user_id, plant_id, log_type, current_condition, notes, tags, logged_at, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
        row.log_type,
        row.current_condition,
        row.notes,
        row.tags,
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
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "care_reminders",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO care_reminders (
          id, remote_id, user_id, plant_id, reminder_type, frequency_days, enabled,
          next_due_at, last_triggered_at, notification_id, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
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

    for (const row of careLogTags) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      const localCareLogId =
        careLogIdByRemote.get(row.care_log_id) ?? row.care_log_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "care_log_tags",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO care_log_tags (
          id, remote_id, user_id, care_log_id, plant_id, tag, created_at, updated_at,
          updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localCareLogId,
        localPlantId,
        row.tag,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of statusSnapshots) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "plant_status_snapshots",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO plant_status_snapshots (
          id, remote_id, user_id, plant_id, status, reason, captured_at, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
        row.status,
        row.reason,
        row.captured_at,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of specimenTags) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "specimen_tags",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO specimen_tags (
          id, remote_id, user_id, plant_id, code, payload, qr_matrix, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
        row.code,
        row.payload,
        row.qr_matrix,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of archiveOverrides) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      const localBeforePhotoId =
        photoIdByRemote.get(row.before_photo_id) ?? row.before_photo_id;
      const localAfterPhotoId =
        photoIdByRemote.get(row.after_photo_id) ?? row.after_photo_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "archive_curation_overrides",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO archive_curation_overrides (
          id, remote_id, user_id, plant_id, before_photo_id, after_photo_id, caption,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
        localBeforePhotoId,
        localAfterPhotoId,
        row.caption,
        row.created_at,
        row.updated_at,
        row.updated_by ?? row.user_id,
        0,
        syncedAt,
        null,
      );
    }

    for (const row of graveyardPlants) {
      const localId = getLocalEntityId(row);
      const localPlantId = plantIdByRemote.get(row.plant_id) ?? row.plant_id;
      if (
        !(await shouldReplaceLocalRow(
          database,
          "graveyard_plants",
          localId,
          row.updated_at,
        ))
      ) {
        continue;
      }

      await database.runAsync(
        `INSERT OR REPLACE INTO graveyard_plants (
          id, remote_id, user_id, plant_id, cause_of_passing, memorial_note, archived_at,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        localId,
        row.id,
        row.user_id,
        localPlantId,
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
        remoteIds: hydratedPhotos.map((row) => getLocalEntityId(row)),
      });
    }

    if (careLogsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "care_logs",
        userId,
        remoteIds: careLogs.map((row) => getLocalEntityId(row)),
      });
    }

    if (remindersResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "care_reminders",
        userId,
        remoteIds: reminders.map((row) => getLocalEntityId(row)),
      });
    }

    if (graveyardResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "graveyard_plants",
        userId,
        remoteIds: graveyardPlants.map((row) => getLocalEntityId(row)),
      });
    }

    if (careLogTagsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "care_log_tags",
        userId,
        remoteIds: careLogTags.map((row) => getLocalEntityId(row)),
      });
    }

    if (statusSnapshotsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "plant_status_snapshots",
        userId,
        remoteIds: statusSnapshots.map((row) => getLocalEntityId(row)),
      });
    }

    if (specimenTagsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "specimen_tags",
        userId,
        remoteIds: specimenTags.map((row) => getLocalEntityId(row)),
      });
    }

    if (archiveOverridesResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "archive_curation_overrides",
        userId,
        remoteIds: archiveOverrides.map((row) => getLocalEntityId(row)),
      });
    }

    if (plantsResult.ok) {
      await reconcileRemoteDeletions({
        database,
        table: "plants",
        userId,
        remoteIds: plants.map((row) => getLocalEntityId(row)),
      });
    }
  });
}

import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "@/services/database/sqlite";
import { notifySyncQueueChanged } from "@/services/database/syncSignals";
import { createId } from "@/utils/id";

const ACTIVE_QUEUE_STATUSES = [
  "pending",
  "failed",
  "processing",
  "deferred",
] as const;

const TERMINALIZE_PENDING_UPSERT_REASON =
  "Local record was removed before changes could be uploaded to the cloud.";

const PENDING_ENTITY_CONFIG = [
  { entity: "plants", table: "plants", idColumn: "id" },
  { entity: "photos", table: "photos", idColumn: "id" },
  { entity: "care_logs", table: "care_logs", idColumn: "id" },
  { entity: "care_reminders", table: "care_reminders", idColumn: "id" },
  { entity: "graveyard_plants", table: "graveyard_plants", idColumn: "id" },
  {
    entity: "user_preferences",
    table: "user_preferences",
    idColumn: "user_id",
  },
  { entity: "care_log_tags", table: "care_log_tags", idColumn: "id" },
  {
    entity: "plant_status_snapshots",
    table: "plant_status_snapshots",
    idColumn: "id",
  },
  { entity: "specimen_tags", table: "specimen_tags", idColumn: "id" },
  {
    entity: "archive_curation_overrides",
    table: "archive_curation_overrides",
    idColumn: "id",
  },
] as const;

async function requeueOrphansForEntity(
  database: SQLiteDatabase,
  userId: string,
  config: (typeof PENDING_ENTITY_CONFIG)[number],
  nowIso: string,
) {
  const statusPlaceholders = ACTIVE_QUEUE_STATUSES.map(() => "?").join(", ");
  const rows = await database.getAllAsync<{ entity_id: string }>(
    `SELECT t.${config.idColumn} AS entity_id
     FROM ${config.table} AS t
     WHERE t.user_id = ?
       AND t.pending = 1
       AND NOT EXISTS (
         SELECT 1
         FROM sync_queue AS q
         WHERE q.entity = ?
           AND q.entity_id = t.${config.idColumn}
           AND q.status IN (${statusPlaceholders})
       );`,
    userId,
    config.entity,
    ...ACTIVE_QUEUE_STATUSES,
  );

  for (const row of rows) {
    await database.runAsync(
      `INSERT INTO sync_queue (
        id, entity, entity_id, operation, payload, status, attempt_count,
        last_error, next_retry_at, queued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      createId("sync"),
      config.entity,
      row.entity_id,
      "update",
      JSON.stringify({ userId }),
      "pending",
      0,
      null,
      null,
      nowIso,
      nowIso,
    );
  }

  return rows.length;
}

export async function terminalizeStaleUpsertQueueWithoutLocalRows(userId: string) {
  const database = await getDatabase();
  const nowIso = new Date().toISOString();
  const statusPlaceholders = ACTIVE_QUEUE_STATUSES.map(() => "?").join(", ");
  let terminalized = 0;

  await database.withTransactionAsync(async () => {
    for (const config of PENDING_ENTITY_CONFIG) {
      const result = await database.runAsync(
        `UPDATE sync_queue
         SET status = 'deleted_before_sync',
             last_error = ?,
             next_retry_at = NULL,
             updated_at = ?
         WHERE entity = ?
           AND operation IN ('insert', 'update')
           AND status IN (${statusPlaceholders})
           AND entity_id NOT IN (
             SELECT ${config.idColumn} FROM ${config.table} WHERE user_id = ?
           );`,
        TERMINALIZE_PENDING_UPSERT_REASON,
        nowIso,
        config.entity,
        ...ACTIVE_QUEUE_STATUSES,
        userId,
      );
      terminalized += result.changes ?? 0;
    }
  });

  if (terminalized > 0) {
    notifySyncQueueChanged();
  }

  return { terminalized };
}

export async function requeueOrphanedPendingSyncRecords(userId: string) {
  const database = await getDatabase();
  const nowIso = new Date().toISOString();
  let requeued = 0;

  await database.withTransactionAsync(async () => {
    for (const config of PENDING_ENTITY_CONFIG) {
      requeued += await requeueOrphansForEntity(
        database,
        userId,
        config,
        nowIso,
      );
    }
  });

  if (requeued > 0) {
    notifySyncQueueChanged();
  }

  return { requeued };
}

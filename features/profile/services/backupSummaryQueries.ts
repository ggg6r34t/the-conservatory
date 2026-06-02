import { getDatabase } from "@/services/database/sqlite";

const SYNCABLE_ENTITY_TABLES = [
  "plants",
  "photos",
  "care_logs",
  "care_reminders",
  "graveyard_plants",
  "user_preferences",
  "care_log_tags",
  "plant_status_snapshots",
  "specimen_tags",
  "archive_curation_overrides",
] as const;

export type SyncableSummaryTable = (typeof SYNCABLE_ENTITY_TABLES)[number];

export async function countUserRecords(
  table: string,
  userId: string,
  extraWhere = "",
) {
  const database = await getDatabase();
  const whereClause = extraWhere ? ` AND ${extraWhere}` : "";
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?${whereClause};`,
    userId,
  );
  return result?.count ?? 0;
}

export async function countUserPendingRecords(table: string, userId: string) {
  return countUserRecords(table, userId, "pending = 1");
}

export async function countUserFailedRecords(table: string, userId: string) {
  return countUserRecords(table, userId, "sync_error IS NOT NULL");
}

export async function getUserTableLastSyncedAt(table: string, userId: string) {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ last_synced_at: string | null }>(
    `SELECT MAX(synced_at) AS last_synced_at
     FROM ${table}
     WHERE user_id = ? AND synced_at IS NOT NULL;`,
    userId,
  );
  return result?.last_synced_at ?? null;
}

export async function getUserLastObservedSyncAt(userId: string) {
  const database = await getDatabase();
  const union = SYNCABLE_ENTITY_TABLES.map(
    (table) => `SELECT synced_at FROM ${table} WHERE user_id = ?`,
  ).join("\n         UNION ALL\n         ");

  const params = SYNCABLE_ENTITY_TABLES.map(() => userId);
  const result = await database.getFirstAsync<{ last_synced_at: string | null }>(
    `SELECT MAX(synced_at) AS last_synced_at
     FROM (
         ${union}
       );`,
    ...params,
  );

  return result?.last_synced_at ?? null;
}

export async function countSyncQueue(
  status: string,
  userId?: string,
) {
  const database = await getDatabase();
  if (userId) {
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM sync_queue
       WHERE status = ?
         AND payload IS NOT NULL
         AND payload LIKE ?;`,
      status,
      `%"userId":"${userId}"%`,
    );
    return result?.count ?? 0;
  }

  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM sync_queue WHERE status = ?;",
    status,
  );
  return result?.count ?? 0;
}

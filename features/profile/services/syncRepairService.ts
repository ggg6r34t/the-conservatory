import { getDatabase } from "@/services/database/sqlite";

export interface SyncRepairItem {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  status: string;
  attemptCount: number;
  lastError: string | null;
  queuedAt: string;
  updatedAt: string;
}

function mapRepairItem(row: {
  id: string;
  entity: string;
  entity_id: string;
  operation: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  queued_at: string;
  updated_at: string;
}): SyncRepairItem {
  return {
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    operation: row.operation,
    status: row.status,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    queuedAt: row.queued_at,
    updatedAt: row.updated_at,
  };
}

export async function listSyncRepairItems() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    entity: string;
    entity_id: string;
    operation: string;
    status: string;
    attempt_count: number;
    last_error: string | null;
    queued_at: string;
    updated_at: string;
  }>(
    `SELECT id, entity, entity_id, operation, status, attempt_count, last_error, queued_at, updated_at
     FROM sync_queue
     WHERE status IN ('failed', 'abandoned', 'processing', 'deleted_before_sync', 'skipped')
     ORDER BY updated_at DESC, queued_at DESC;`,
  );

  return rows.map(mapRepairItem);
}

export async function retrySyncRepairItems(ids?: string[]) {
  const database = await getDatabase();
  const updatedAt = new Date().toISOString();

  if (ids?.length) {
    const uniqueIds = Array.from(new Set(ids));
    const placeholders = uniqueIds.map(() => "?").join(", ");
    await database.runAsync(
      `UPDATE sync_queue
       SET status = 'pending',
           last_error = NULL,
           next_retry_at = NULL,
           updated_at = ?
       WHERE id IN (${placeholders})
         AND status IN ('failed', 'abandoned', 'processing');`,
      updatedAt,
      ...uniqueIds,
    );
    return uniqueIds.length;
  }

  await database.runAsync(
    `UPDATE sync_queue
     SET status = 'pending',
         last_error = NULL,
         next_retry_at = NULL,
         updated_at = ?
     WHERE status IN ('failed', 'abandoned', 'processing');`,
    updatedAt,
  );

  return null;
}

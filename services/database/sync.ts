import { env } from "@/config/env";
import { getDatabase } from "@/services/database/sqlite";
import { createId } from "@/utils/id";

export type SyncOperation = "insert" | "update" | "delete";
export type SyncStatus = "pending" | "processing" | "failed" | "completed";

export interface SyncQueueItem {
  id: string;
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload: string | null;
  status: SyncStatus;
  attemptCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  queuedAt: string;
  updatedAt: string;
}

export interface SyncQueueStorage {
  insert(item: SyncQueueItem): Promise<void>;
  listProcessable(nowIso: string, limit: number): Promise<SyncQueueItem[]>;
  countProcessable(nowIso: string): Promise<number>;
  reclaimStaleProcessing(
    staleBeforeIso: string,
    nowIso: string,
    errorMessage: string,
  ): Promise<number>;
  markProcessing(id: string, updatedAt: string): Promise<void>;
  markCompleted(id: string, updatedAt: string): Promise<void>;
  markFailed(
    id: string,
    errorMessage: string,
    nextRetryAt: string,
    updatedAt: string,
  ): Promise<void>;
}

const PROCESSING_STALE_TIMEOUT_MS = 5 * 60 * 1000;

function mapRow(row: {
  id: string;
  entity: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string | null;
  status: SyncStatus;
  attempt_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  queued_at: string;
  updated_at: string;
}): SyncQueueItem {
  return {
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    operation: row.operation,
    payload: row.payload,
    status: row.status,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    nextRetryAt: row.next_retry_at,
    queuedAt: row.queued_at,
    updatedAt: row.updated_at,
  };
}

class SQLiteSyncQueueStorage implements SyncQueueStorage {
  async insert(item: SyncQueueItem) {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO sync_queue (
        id, entity, entity_id, operation, payload, status, attempt_count,
        last_error, next_retry_at, queued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      item.id,
      item.entity,
      item.entityId,
      item.operation,
      item.payload,
      item.status,
      item.attemptCount,
      item.lastError,
      item.nextRetryAt,
      item.queuedAt,
      item.updatedAt,
    );
  }

  async listProcessable(nowIso: string, limit: number) {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{
      id: string;
      entity: string;
      entity_id: string;
      operation: SyncOperation;
      payload: string | null;
      status: SyncStatus;
      attempt_count: number;
      last_error: string | null;
      next_retry_at: string | null;
      queued_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM sync_queue
       WHERE status IN ('pending', 'failed')
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY queued_at ASC
       LIMIT ?;`,
      nowIso,
      limit,
    );

    return rows.map(mapRow);
  }

  async countProcessable(nowIso: string) {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue
       WHERE status IN ('pending', 'failed')
         AND (next_retry_at IS NULL OR next_retry_at <= ?);`,
      nowIso,
    );

    return result?.count ?? 0;
  }

  async markProcessing(id: string, updatedAt: string) {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?;",
      updatedAt,
      id,
    );
  }

  async reclaimStaleProcessing(
    staleBeforeIso: string,
    nowIso: string,
    errorMessage: string,
  ) {
    const database = await getDatabase();
    const staleRows = await database.getAllAsync<{ id: string }>(
      `SELECT id FROM sync_queue
       WHERE status = 'processing'
         AND updated_at <= ?;`,
      staleBeforeIso,
    );

    for (const row of staleRows) {
      await database.runAsync(
        `UPDATE sync_queue
         SET status = 'failed',
             attempt_count = attempt_count + 1,
             last_error = ?,
             next_retry_at = ?,
             updated_at = ?
         WHERE id = ?;`,
        errorMessage,
        nowIso,
        nowIso,
        row.id,
      );
    }

    return staleRows.length;
  }

  async markCompleted(id: string, updatedAt: string) {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE sync_queue SET status = 'completed', last_error = NULL, next_retry_at = NULL, updated_at = ? WHERE id = ?;",
      updatedAt,
      id,
    );
  }

  async markFailed(
    id: string,
    errorMessage: string,
    nextRetryAt: string,
    updatedAt: string,
  ) {
    const database = await getDatabase();
    await database.runAsync(
      `UPDATE sync_queue
       SET status = 'failed',
           attempt_count = attempt_count + 1,
           last_error = ?,
           next_retry_at = ?,
           updated_at = ?
       WHERE id = ?;`,
      errorMessage,
      nextRetryAt,
      updatedAt,
      id,
    );
  }
}

function computeRetryAt(attemptCount: number, nowIso: string) {
  const now = new Date(nowIso);
  const minutes = Math.min(2 ** Math.max(attemptCount, 0), 60);
  now.setMinutes(now.getMinutes() + minutes);
  return now.toISOString();
}

export function createSyncQueueService(storage: SyncQueueStorage) {
  return {
    async enqueueSyncOperation(input: {
      entity: string;
      entityId: string;
      operation: SyncOperation;
      payload?: Record<string, unknown>;
      nowIso?: string;
    }) {
      const nowIso = input.nowIso ?? new Date().toISOString();
      const item: SyncQueueItem = {
        id: createId("sync"),
        entity: input.entity,
        entityId: input.entityId,
        operation: input.operation,
        payload: input.payload ? JSON.stringify(input.payload) : null,
        status: "pending",
        attemptCount: 0,
        lastError: null,
        nextRetryAt: null,
        queuedAt: nowIso,
        updatedAt: nowIso,
      };
      await storage.insert(item);
      return item;
    },

    async syncPendingChanges(options?: {
      processOperation?: (item: SyncQueueItem) => Promise<void>;
      limit?: number;
      nowIso?: string;
    }) {
      const nowIso = options?.nowIso ?? new Date().toISOString();
      const limit = options?.limit ?? 25;
      const staleBeforeIso = new Date(
        new Date(nowIso).getTime() - PROCESSING_STALE_TIMEOUT_MS,
      ).toISOString();
      const reclaimed = await storage.reclaimStaleProcessing(
        staleBeforeIso,
        nowIso,
        "Reclaimed stale processing sync item after timeout.",
      );
      let processOperation = options?.processOperation ?? null;

      if (
        !processOperation &&
        env.enableSyncTrials &&
        env.isSupabaseConfigured
      ) {
        const { processSyncQueueItemWithSupabase } =
          await import("@/services/database/supabaseSyncAdapter");
        processOperation = processSyncQueueItemWithSupabase;
      }

      if (!processOperation) {
        return {
          reclaimed,
          processed: 0,
          successful: 0,
          failed: 0,
          remaining: await storage.countProcessable(nowIso),
        };
      }

      const queue = await storage.listProcessable(nowIso, limit);

      let successful = 0;
      let failed = 0;

      for (const item of queue) {
        const startedAt = new Date().toISOString();
        await storage.markProcessing(item.id, startedAt);

        try {
          await processOperation(item);
          await storage.markCompleted(item.id, new Date().toISOString());
          successful += 1;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown sync failure.";
          const nextRetryAt = computeRetryAt(item.attemptCount + 1, nowIso);
          await storage.markFailed(
            item.id,
            errorMessage,
            nextRetryAt,
            new Date().toISOString(),
          );
          failed += 1;
        }
      }

      const remaining = await storage.countProcessable(nowIso);
      return {
        reclaimed,
        processed: queue.length,
        successful,
        failed,
        remaining,
      };
    },
  };
}

const syncService = createSyncQueueService(new SQLiteSyncQueueStorage());

export const enqueueSyncOperation = syncService.enqueueSyncOperation;
export const syncPendingChanges = syncService.syncPendingChanges;

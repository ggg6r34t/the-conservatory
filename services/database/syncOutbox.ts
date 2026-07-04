import type { SQLiteDatabase } from "expo-sqlite";

import type { SyncOperation } from "@/services/database/sync";
import { shouldSkipSyncOutboxForActiveUser } from "@/services/database/syncDataOwner";
import { notifySyncQueueChanged } from "@/services/database/syncSignals";
import { createId } from "@/utils/id";

interface SyncOutboxOperation {
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload?: Record<string, unknown> | null;
}

interface AtomicSyncOutboxResult<T> {
  result: T;
  operations: SyncOutboxOperation[];
}

function serializePayload(payload?: Record<string, unknown> | null) {
  if (!payload) {
    return null;
  }

  return JSON.stringify(payload);
}

const TERMINALIZE_PENDING_UPSERT_REASON =
  "Local record was removed before changes could be uploaded to the cloud.";

const ACTIVE_UPSERT_QUEUE_STATUSES = [
  "pending",
  "failed",
  "processing",
  "deferred",
] as const;

/** Marks stale insert/update queue rows terminal when the local row was removed first. */
export async function terminalizePendingUpsertSyncQueueInTransaction(
  database: SQLiteDatabase,
  input: {
    entity: string;
    entityId: string;
    nowIso: string;
  },
) {
  const statusPlaceholders = ACTIVE_UPSERT_QUEUE_STATUSES.map(() => "?").join(
    ", ",
  );

  await database.runAsync(
    `UPDATE sync_queue
     SET status = 'deleted_before_sync',
         last_error = ?,
         next_retry_at = NULL,
         updated_at = ?
     WHERE entity = ?
       AND entity_id = ?
       AND operation IN ('insert', 'update')
       AND status IN (${statusPlaceholders});`,
    TERMINALIZE_PENDING_UPSERT_REASON,
    input.nowIso,
    input.entity,
    input.entityId,
    ...ACTIVE_UPSERT_QUEUE_STATUSES,
  );
}

export async function terminalizePendingUpsertSyncQueueItemsInTransaction(
  database: SQLiteDatabase,
  input: {
    entity: string;
    entityIds: string[];
    nowIso: string;
  },
) {
  for (const entityId of input.entityIds) {
    await terminalizePendingUpsertSyncQueueInTransaction(database, {
      entity: input.entity,
      entityId,
      nowIso: input.nowIso,
    });
  }
}

export async function insertSyncOutboxOperationInTransaction(
  database: SQLiteDatabase,
  input: {
    operation: SyncOutboxOperation;
    nowIso: string;
  },
) {
  await database.runAsync(
    `INSERT INTO sync_queue (
      id, entity, entity_id, operation, payload, status, attempt_count,
      last_error, next_retry_at, queued_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    createId("sync"),
    input.operation.entity,
    input.operation.entityId,
    input.operation.operation,
    serializePayload(input.operation.payload),
    "pending",
    0,
    null,
    null,
    input.nowIso,
    input.nowIso,
  );
}

export async function runAtomicMutationWithSyncOutbox<T>(
  database: SQLiteDatabase,
  input: {
    nowIso?: string;
    perform: (nowIso: string) => Promise<AtomicSyncOutboxResult<T>>;
  },
) {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const noResult = Symbol("atomic-sync-outbox-no-result");
  let result: T | typeof noResult = noResult;

  await database.withTransactionAsync(async () => {
    const execution = await input.perform(nowIso);
    const skipSyncOutbox = shouldSkipSyncOutboxForActiveUser();

    if (!skipSyncOutbox) {
      for (const operation of execution.operations) {
        await insertSyncOutboxOperationInTransaction(database, {
          operation,
          nowIso,
        });
      }
    }

    result = execution.result;
  });

  if (result === noResult) {
    throw new Error("Atomic sync mutation completed without a result.");
  }

  if (!shouldSkipSyncOutboxForActiveUser()) {
    notifySyncQueueChanged();
  }
  return result;
}

export type { AtomicSyncOutboxResult, SyncOutboxOperation };

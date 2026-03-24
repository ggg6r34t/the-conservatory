import type { SQLiteDatabase } from "expo-sqlite";

import type { SyncOperation } from "@/services/database/sync";
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

    for (const operation of execution.operations) {
      await insertSyncOutboxOperationInTransaction(database, {
        operation,
        nowIso,
      });
    }

    result = execution.result;
  });

  if (result === noResult) {
    throw new Error("Atomic sync mutation completed without a result.");
  }

  return result;
}

export type { AtomicSyncOutboxResult, SyncOutboxOperation };

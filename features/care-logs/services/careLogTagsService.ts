import { getDatabase } from "@/services/database/sqlite";
import {
  insertSyncOutboxOperationInTransaction,
  type SyncOutboxOperation,
} from "@/services/database/syncOutbox";
import { createId } from "@/utils/id";

export function normalizeCareLogTags(tags: readonly string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  ).sort((left, right) => left.localeCompare(right));
}

export function serializeCareLogTags(tags: readonly string[]) {
  const normalized = normalizeCareLogTags(tags);
  return normalized.length ? JSON.stringify(normalized) : null;
}

export async function replaceCareLogTagsInTransaction(
  database: Awaited<ReturnType<typeof getDatabase>>,
  input: {
    userId: string;
    plantId: string;
    careLogId: string;
    tags: readonly string[];
    nowIso: string;
    clearExisting?: boolean;
    queueSync?: boolean;
  },
) {
  const normalizedTags = normalizeCareLogTags(input.tags);

  if (input.clearExisting ?? true) {
    await database.runAsync(
      "DELETE FROM care_log_tags WHERE care_log_id = ?;",
      input.careLogId,
    );
  }

  const operations: SyncOutboxOperation[] = [];

  for (const tag of normalizedTags) {
    const tagId = createId("logtag");
    await database.runAsync(
      `INSERT INTO care_log_tags (
        id, user_id, care_log_id, plant_id, tag, created_at, updated_at, updated_by,
        pending, synced_at, sync_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      tagId,
      input.userId,
      input.careLogId,
      input.plantId,
      tag,
      input.nowIso,
      input.nowIso,
      input.userId,
      1,
      null,
      null,
    );

    operations.push({
      entity: "care_log_tags",
      entityId: tagId,
      operation: "insert",
      payload: {
        userId: input.userId,
        plantId: input.plantId,
        careLogId: input.careLogId,
        tag,
      },
    });
  }

  if (input.queueSync) {
    for (const operation of operations) {
      await insertSyncOutboxOperationInTransaction(database, {
        operation,
        nowIso: input.nowIso,
      });
    }
  }

  return {
    tags: normalizedTags,
    tagsJson: serializeCareLogTags(normalizedTags),
    operations,
  };
}

export async function listCareLogTags(careLogId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ tag: string }>(
    "SELECT tag FROM care_log_tags WHERE care_log_id = ? ORDER BY tag ASC;",
    careLogId,
  );
  return rows.map((row) => row.tag);
}

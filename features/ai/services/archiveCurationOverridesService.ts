import { getDatabase } from "@/services/database/sqlite";
import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";
import { createId } from "@/utils/id";

export interface ArchiveCurationOverrideInput {
  plantId: string;
  beforePhotoId: string;
  afterPhotoId: string;
  caption?: string | null;
}

export function buildArchiveOverrideKey(input: ArchiveCurationOverrideInput) {
  return `${input.plantId}:${input.beforePhotoId}:${input.afterPhotoId}`;
}

export function normalizeArchiveOverride(input: ArchiveCurationOverrideInput) {
  return {
    plantId: input.plantId,
    beforePhotoId: input.beforePhotoId,
    afterPhotoId: input.afterPhotoId,
    caption: input.caption?.trim() || null,
  };
}

export async function saveArchiveCurationOverride(input: {
  userId: string;
  selection: ArchiveCurationOverrideInput;
}) {
  const database = await getDatabase();
  const normalized = normalizeArchiveOverride(input.selection);
  const now = new Date().toISOString();
  const existing = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM archive_curation_overrides
     WHERE user_id = ? AND plant_id = ? AND before_photo_id = ? AND after_photo_id = ?
     LIMIT 1;`,
    input.userId,
    normalized.plantId,
    normalized.beforePhotoId,
    normalized.afterPhotoId,
  );
  const id = existing?.id ?? createId("archiveoverride");
  const operation = existing ? "update" : "insert";

  return runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (nowIso) => {
      await database.runAsync(
        `INSERT OR REPLACE INTO archive_curation_overrides (
          id, user_id, plant_id, before_photo_id, after_photo_id, caption,
          created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          COALESCE((SELECT created_at FROM archive_curation_overrides WHERE id = ?), ?),
          ?,
          ?,
          ?,
          ?,
          ?
        );`,
        id,
        input.userId,
        normalized.plantId,
        normalized.beforePhotoId,
        normalized.afterPhotoId,
        normalized.caption,
        id,
        nowIso,
        nowIso,
        input.userId,
        1,
        null,
        null,
      );

      return {
        result: { id, userId: input.userId, ...normalized },
        operations: [
          {
            entity: "archive_curation_overrides",
            entityId: id,
            operation: operation as "insert" | "update",
            payload: {
              userId: input.userId,
              plantId: normalized.plantId,
            },
          },
        ],
      };
    },
  });
}

export async function listArchiveCurationOverrides(userId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    before_photo_id: string;
    after_photo_id: string;
    caption: string | null;
  }>(
    `SELECT id, user_id, plant_id, before_photo_id, after_photo_id, caption
     FROM archive_curation_overrides
     WHERE user_id = ?
     ORDER BY updated_at DESC;`,
    userId,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    beforePhotoId: row.before_photo_id,
    afterPhotoId: row.after_photo_id,
    caption: row.caption,
  }));
}

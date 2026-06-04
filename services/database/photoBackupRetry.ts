import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import { getDatabase } from "@/services/database/sqlite";
import { notifySyncQueueChanged } from "@/services/database/syncSignals";
import { createId } from "@/utils/id";

interface DeferredPhotoRow {
  id: string;
  user_id: string;
  plant_id: string;
}

export async function retryDeferredPremiumPhotoBackups(userId: string) {
  const database = await getDatabase();
  const nowIso = new Date().toISOString();
  const photos = await database.getAllAsync<DeferredPhotoRow>(
    `SELECT id, user_id, plant_id
     FROM photos
     WHERE user_id = ?
       AND local_uri IS NOT NULL
       AND TRIM(local_uri) != ''
       AND storage_path IS NOT NULL
       AND TRIM(storage_path) != ''
       AND (remote_url IS NULL OR TRIM(remote_url) = '')`,
    userId,
  );

  let requeued = 0;

  await database.withTransactionAsync(async () => {
    for (const photo of photos) {
      await database.runAsync(
        `UPDATE photos
         SET pending = 1,
             sync_error = NULL,
             updated_at = ?
         WHERE id = ?;`,
        nowIso,
        photo.id,
      );

      const existingQueue = await database.getFirstAsync<{ id: string; status: string }>(
        `SELECT id, status
         FROM sync_queue
         WHERE entity = 'photos'
           AND entity_id = ?
           AND operation IN ('insert', 'update')
           AND status IN ('pending', 'failed', 'processing', 'deferred')
         LIMIT 1;`,
        photo.id,
      );

      if (existingQueue?.status === "deferred") {
        await database.runAsync(
          `UPDATE sync_queue
           SET status = 'pending',
               last_error = NULL,
               next_retry_at = NULL,
               updated_at = ?
           WHERE id = ?;`,
          nowIso,
          existingQueue.id,
        );
        requeued += 1;
        continue;
      }

      if (existingQueue) {
        continue;
      }

      await database.runAsync(
        `INSERT INTO sync_queue (
          id, entity, entity_id, operation, payload, status, attempt_count,
          last_error, next_retry_at, queued_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        createId("sync"),
        "photos",
        photo.id,
        "insert",
        JSON.stringify({
          userId: photo.user_id,
          plantId: photo.plant_id,
        }),
        "pending",
        0,
        null,
        null,
        nowIso,
        nowIso,
      );
      requeued += 1;
    }
  });

  if (photos.length > 0) {
    notifySyncQueueChanged();
    trackMonetizationEvent("premium_deferred_photo_retry", {
      scanned: photos.length,
      requeued,
    });
  }

  return {
    scanned: photos.length,
    requeued,
  };
}

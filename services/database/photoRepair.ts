import {
  isManagedPhotoUri,
  persistPhotoAsset,
} from "@/features/plants/services/photoStorageService";
import { getDatabase } from "@/services/database/sqlite";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";
import { logger } from "@/utils/logger";

interface LocalPhotoRepairRow {
  id: string;
  user_id: string;
  plant_id: string;
  local_uri: string | null;
  remote_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  photo_role: "primary" | "progress" | null;
  is_primary: number;
}

function deriveMimeType(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.includes("/")) {
    return value;
  }

  return null;
}

export async function repairLocalPhotoRecords(userId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<LocalPhotoRepairRow>(
    "SELECT id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type, photo_role, is_primary FROM photos WHERE user_id = ?;",
    userId,
  );

  for (const row of rows) {
    let nextLocalUri = row.local_uri;
    let nextStoragePath = row.storage_path;
    let nextSyncError: string | null = null;

    if (row.local_uri && !isManagedPhotoUri(row.local_uri)) {
      try {
        const persisted = await persistPhotoAsset({
          sourceUri: row.local_uri,
          userId: row.user_id,
          plantId: row.plant_id,
          photoId: row.id,
          role:
            row.photo_role ?? (row.is_primary === 1 ? "primary" : "progress"),
          mimeType: row.mime_type ?? "image/jpeg",
        });
        nextLocalUri = persisted.localUri;
        nextStoragePath = persisted.storagePath;
      } catch (error) {
        nextSyncError =
          "Photo file needs to be reselected before it can be backed up.";
        logger.warn("photos.legacy_local_uri_migration_failed", {
          photoId: row.id,
          userId: row.user_id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const directRemoteUrl = row.remote_url?.startsWith("http")
      ? row.remote_url
      : nextStoragePath?.startsWith("http")
        ? nextStoragePath
        : null;
    const normalizedStoragePath =
      normalizeStoragePath(nextStoragePath) ??
      normalizeStoragePath(row.remote_url);
    const nextMimeType = deriveMimeType(row.mime_type) ?? "image/jpeg";
    const generatedRemoteUrl = normalizedStoragePath
      ? await getStorageAssetUrl(normalizedStoragePath)
      : null;
    const nextRemoteUrl =
      directRemoteUrl ??
      generatedRemoteUrl ??
      (row.remote_url?.startsWith("http") ? row.remote_url : null);

    if (
      normalizedStoragePath === row.storage_path &&
      nextLocalUri === row.local_uri &&
      nextMimeType === row.mime_type &&
      nextRemoteUrl === row.remote_url &&
      nextSyncError === null
    ) {
      continue;
    }

    await database.runAsync(
      "UPDATE photos SET local_uri = ?, storage_path = ?, remote_url = ?, mime_type = ?, sync_error = COALESCE(?, sync_error), updated_at = ? WHERE id = ?;",
      nextLocalUri,
      normalizedStoragePath,
      nextRemoteUrl,
      nextMimeType,
      nextSyncError,
      new Date().toISOString(),
      row.id,
    );
  }
}

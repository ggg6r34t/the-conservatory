import { getDatabase } from "@/services/database/sqlite";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";

interface LocalPhotoRepairRow {
  id: string;
  user_id: string;
  remote_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
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
    "SELECT id, user_id, remote_url, storage_path, mime_type FROM photos WHERE user_id = ?;",
    userId,
  );

  for (const row of rows) {
    const directRemoteUrl =
      row.remote_url?.startsWith("http")
        ? row.remote_url
        : row.storage_path?.startsWith("http")
          ? row.storage_path
          : null;
    const normalizedStoragePath =
      normalizeStoragePath(row.storage_path) ??
      normalizeStoragePath(row.remote_url);
    const nextMimeType =
      deriveMimeType(row.mime_type) ?? "image/jpeg";
    const generatedRemoteUrl = normalizedStoragePath
      ? await getStorageAssetUrl(normalizedStoragePath)
      : null;
    const nextRemoteUrl =
      directRemoteUrl ??
      generatedRemoteUrl ??
      (row.remote_url?.startsWith("http") ? row.remote_url : null);

    if (
      normalizedStoragePath === row.storage_path &&
      nextMimeType === row.mime_type &&
      nextRemoteUrl === row.remote_url
    ) {
      continue;
    }

    await database.runAsync(
      "UPDATE photos SET storage_path = ?, remote_url = ?, mime_type = ?, updated_at = ? WHERE id = ?;",
      normalizedStoragePath,
      nextRemoteUrl,
      nextMimeType,
      new Date().toISOString(),
      row.id,
    );
  }
}

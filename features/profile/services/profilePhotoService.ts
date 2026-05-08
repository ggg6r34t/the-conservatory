import { Directory, File, Paths } from "expo-file-system";

import { STORAGE_BUCKET } from "@/config/constants";
import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import type { PlantImageAsset } from "@/features/plants/services/photoService";
import { getStorageAssetUrl } from "@/services/supabase/storage";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/webp": "webp",
};

const ALL_MANAGED_EXTENSIONS = Object.values(EXTENSION_BY_MIME);

function resolveExtension(mimeType?: string | null, uri?: string) {
  if (mimeType) {
    const mapped = EXTENSION_BY_MIME[mimeType.toLowerCase()];
    if (mapped) return mapped;
  }
  const match = uri?.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildAvatarStoragePath(userId: string, extension: string) {
  return `${sanitizeSegment(userId)}/avatar/profile.${extension}`;
}

async function ensureAvatarDirectory(userId: string) {
  const root = new Directory(Paths.document, "photos");
  const userDir = new Directory(root.uri, sanitizeSegment(userId));
  const avatarDir = new Directory(userDir.uri, "avatar");
  avatarDir.create({ idempotent: true, intermediates: true });
  return avatarDir;
}

export async function persistAvatarLocally(
  sourceUri: string,
  userId: string,
  mimeType?: string | null,
): Promise<string> {
  const ext = resolveExtension(mimeType, sourceUri);
  const dir = await ensureAvatarDirectory(userId);

  // Remove stale files with a different extension (deterministic single-file slot).
  for (const staleExt of ALL_MANAGED_EXTENSIONS) {
    if (staleExt === ext) continue;
    const stale = new File(dir.uri, `profile.${staleExt}`);
    const info = await stale.info();
    if (info.exists) await stale.delete();
  }

  const destination = new File(dir.uri, `profile.${ext}`);
  const source = new File(sourceUri);
  await source.copy(destination);

  const info = await destination.info();
  if (!info.exists) {
    throw new Error("Avatar could not be saved on this device.");
  }
  return destination.uri;
}

export async function uploadAvatarToStorage(
  localUri: string,
  userId: string,
  mimeType?: string | null,
): Promise<string> {
  if (!supabase) {
    throw new Error("Cloud storage is not available.");
  }

  const ext = resolveExtension(mimeType, localUri);
  const storagePath = buildAvatarStoragePath(userId, ext);
  const contentType = mimeType ?? "image/jpeg";

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("Unable to read local photo for upload.");
  }

  const blob = await response.blob();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, blob, { contentType, upsert: true });

  if (error) {
    throw new Error(error.message);
  }

  const url = await getStorageAssetUrl(storagePath);
  if (!url) {
    throw new Error("Unable to generate photo URL after upload.");
  }
  return url;
}

export async function uploadProfileAvatar(
  userId: string,
  asset: PlantImageAsset,
): Promise<{ localUri: string; avatarUrl: string }> {
  const localUri = await persistAvatarLocally(asset.uri, userId, asset.mimeType);

  if (!env.isSupabaseConfigured || !supabase) {
    // Offline / no-cloud mode: use the local file URI as the avatar URL.
    return { localUri, avatarUrl: localUri };
  }

  const avatarUrl = await uploadAvatarToStorage(localUri, userId, asset.mimeType);
  return { localUri, avatarUrl };
}

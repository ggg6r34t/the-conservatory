import { STORAGE_BUCKET } from "@/config/constants";
import { supabase } from "@/config/supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

function isHttpUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function normalizeStoragePath(storagePath: string | null | undefined) {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith(`${STORAGE_BUCKET}/`)) {
    return storagePath.slice(STORAGE_BUCKET.length + 1);
  }

  try {
    const url = new URL(storagePath);
    const marker = `/object/sign/${STORAGE_BUCKET}/`;
    const publicMarker = `/object/public/${STORAGE_BUCKET}/`;

    if (url.pathname.includes(marker)) {
      return decodeURIComponent(url.pathname.split(marker)[1] ?? "");
    }

    if (url.pathname.includes(publicMarker)) {
      return decodeURIComponent(url.pathname.split(publicMarker)[1] ?? "");
    }
  } catch {
    return storagePath;
  }

  return storagePath;
}

export async function getStorageAssetUrl(
  storagePath: string | null | undefined,
) {
  if (isHttpUrl(storagePath)) {
    return storagePath;
  }

  const normalizedStoragePath = normalizeStoragePath(storagePath);

  if (isHttpUrl(normalizedStoragePath)) {
    return normalizedStoragePath;
  }

  if (!supabase || !normalizedStoragePath) {
    return null;
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(normalizedStoragePath, SIGNED_URL_TTL_SECONDS);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(normalizedStoragePath);

  return publicData.publicUrl || null;
}

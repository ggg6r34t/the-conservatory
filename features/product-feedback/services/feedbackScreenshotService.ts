import { STORAGE_BUCKET } from "@/config/constants";
import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { FEEDBACK_SCREENSHOT_STORAGE_PREFIX } from "@/features/product-feedback/constants";
import { getStorageAssetUrl } from "@/services/supabase/storage";

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildFeedbackScreenshotPath(
  userId: string,
  requestId: string,
  index: number,
) {
  return `${sanitizeSegment(userId)}/${FEEDBACK_SCREENSHOT_STORAGE_PREFIX}/${sanitizeSegment(requestId)}/${index}.jpg`;
}

export async function uploadFeedbackScreenshot(input: {
  userId: string;
  requestId: string;
  localUri: string;
  index: number;
  mimeType?: string | null;
}) {
  if (!env.isSupabaseConfigured || !supabase) {
    throw new Error("Cloud storage is unavailable.");
  }

  const storagePath = buildFeedbackScreenshotPath(
    input.userId,
    input.requestId,
    input.index,
  );
  const response = await fetch(input.localUri);
  if (!response.ok) {
    throw new Error("Unable to read screenshot for upload.");
  }

  const blob = await response.blob();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, blob, {
      contentType: input.mimeType ?? "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const url = await getStorageAssetUrl(storagePath);
  if (!url) {
    throw new Error("Unable to resolve uploaded screenshot URL.");
  }

  return url;
}

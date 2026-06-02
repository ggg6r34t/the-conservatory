import { File } from "expo-file-system";

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
};

function inferMimeType(uri: string) {
  const normalized = uri.split("?")[0]?.toLowerCase() ?? uri;
  const match = normalized.match(/\.([a-z0-9]+)$/);
  const extension = match?.[1];
  if (!extension) {
    return "image/jpeg";
  }
  return EXTENSION_MIME[extension] ?? "image/jpeg";
}

export async function encodeLocalImageForAi(
  uri: string,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  try {
    const file = new File(uri);
    const info = await file.info();
    if (!info.exists) {
      return null;
    }
    const imageBase64 = await file.base64();
    if (!imageBase64) {
      return null;
    }
    return {
      imageBase64,
      mimeType: inferMimeType(uri),
    };
  } catch {
    return null;
  }
}

import { requestArchiveCuration } from "@/features/ai/api/aiClient";
import { withCuratedArchivePairSource } from "@/features/ai/schemas/aiMappers";
import { parseArchiveCurationResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import type { ArchiveCuratedPair } from "@/features/ai/types/ai";

const ARCHIVE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

export interface ArchiveCurationItem {
  plantId: string;
  plantName: string;
  photoUris: string[];
}

function buildArchiveCurationCacheKey(revision: string) {
  return `ai:archive:${revision}`;
}

function uniqueUris(uris: string[]) {
  return Array.from(new Set(uris.filter(Boolean)));
}

function buildRevision(items: ArchiveCurationItem[]) {
  return items
    .map(
      (item) =>
        `${item.plantId}:${item.photoUris.length}:${item.photoUris[0] ?? "none"}`,
    )
    .join("|");
}

export function curateArchiveLocally(items: ArchiveCurationItem[]) {
  return items
    .map((item) => {
      const photoUris = uniqueUris(item.photoUris);
      if (photoUris.length < 2) {
        return null;
      }

      const beforeUri = photoUris[photoUris.length - 1];
      const afterUri = photoUris[0];
      if (beforeUri === afterUri) {
        return null;
      }

      return withCuratedArchivePairSource(
        {
          plantId: item.plantId,
          plantName: item.plantName,
          beforeUri,
          afterUri,
          caption: "Earlier and later moments, held together in the archive.",
        },
        "local",
      );
    })
    .filter((value): value is ArchiveCuratedPair => Boolean(value))
    .slice(0, 3);
}

export async function getArchiveCuration(items: ArchiveCurationItem[]) {
  const revision = buildRevision(items);
  if (!revision) {
    return [];
  }

  const cacheKey = buildArchiveCurationCacheKey(revision);
  const cached = await getCachedValue<ArchiveCuratedPair[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const fallback = curateArchiveLocally(items);
  if (!fallback.length) {
    return [];
  }

  const cloud = await requestArchiveCuration({
    items: items.map((item) => ({
      plantId: item.plantId,
      plantName: item.plantName,
      photoUris: uniqueUris(item.photoUris),
    })),
  });

  const parsedCloud = parseArchiveCurationResponse(cloud).map((pair) =>
    withCuratedArchivePairSource(pair, "cloud"),
  );
  const result = parsedCloud.length ? parsedCloud : fallback;

  await setCachedValue(cacheKey, result, ARCHIVE_CACHE_TTL_MS);
  return result;
}

import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import type { CareLog, Photo, PlantWithRelations } from "@/types/models";

type GrowthTimelineLog = {
  id: string;
  loggedAt: string;
  title: string;
  body: string | null;
};

export interface GrowthTimelineItem {
  id: string;
  imageUri: string;
  timestamp: string;
  dateLabel: string;
  associatedLog: GrowthTimelineLog | null;
  caption: string | null;
}

type ResolvedTimelinePhoto = {
  id: string;
  imageUri: string;
  timestamp: string;
  capturedAtMs: number | null;
  takenAtMs: number | null;
  createdAtMs: number | null;
  associatedLog: GrowthTimelineLog | null;
  caption: string | null;
};

export function resolveGrowthTimelinePhotoRole(
  photo: Pick<Photo, "photoRole" | "isPrimary">,
) {
  return photo.photoRole ?? (photo.isPrimary === 1 ? "primary" : "progress");
}

export function resolveGrowthTimelinePhotoUri(
  photo: Pick<Photo, "localUri" | "remoteUrl">,
) {
  if (photo.remoteUrl) {
    return photo.remoteUrl;
  }

  if (photo.localUri) {
    return photo.localUri;
  }

  return null;
}

export function resolveGrowthTimelinePhotoTimestamp(
  photo: Pick<Photo, "capturedAt" | "takenAt" | "createdAt">,
) {
  return normalizeIsoTimestamp(
    photo.capturedAt ?? photo.takenAt ?? photo.createdAt,
  );
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeIsoTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = toTimestamp(value);
  if (timestamp == null) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

function getLogTitle(log: CareLog) {
  switch (log.logType) {
    case "water":
      return "Water log";
    case "mist":
      return "Mist log";
    case "feed":
      return "Feeding log";
    case "repot":
      return "Repot log";
    case "prune":
      return "Pruning log";
    case "inspect":
      return "Inspection log";
    case "pest":
      return "Pest treatment log";
    case "note":
    default:
      return "Observation log";
  }
}

function getLogBody(log: CareLog) {
  const parsed = parseStructuredCareLogNote(log.notes);
  const body = parsed.body?.trim() || log.notes?.trim() || null;

  return body || null;
}

function findClosestLog(logs: CareLog[], timestamp: string) {
  const targetTime = toTimestamp(timestamp);
  if (targetTime == null) {
    return null;
  }

  const maxDistance = 1000 * 60 * 60 * 24 * 21;
  let bestMatch: CareLog | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const log of logs) {
    const logTime = toTimestamp(log.loggedAt);
    if (logTime == null) {
      continue;
    }

    const distance = Math.abs(logTime - targetTime);
    if (distance > maxDistance) {
      continue;
    }

    if (distance < bestDistance) {
      bestMatch = log;
      bestDistance = distance;
      continue;
    }

    if (distance === bestDistance && bestMatch) {
      if ((toTimestamp(log.loggedAt) ?? 0) < (toTimestamp(bestMatch.loggedAt) ?? 0)) {
        bestMatch = log;
      }
    }
  }

  return bestMatch;
}

function compareNullableAsc(left: number | null, right: number | null) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  return left - right;
}

function compareTimelinePhotos(
  left: Pick<ResolvedTimelinePhoto, "timestamp" | "capturedAtMs" | "takenAtMs" | "createdAtMs" | "id">,
  right: Pick<ResolvedTimelinePhoto, "timestamp" | "capturedAtMs" | "takenAtMs" | "createdAtMs" | "id">,
) {
  const resolvedComparison = compareNullableAsc(
    toTimestamp(left.timestamp),
    toTimestamp(right.timestamp),
  );

  if (resolvedComparison !== 0) {
    return resolvedComparison;
  }

  const capturedComparison = compareNullableAsc(
    left.capturedAtMs,
    right.capturedAtMs,
  );
  if (capturedComparison !== 0) {
    return capturedComparison;
  }

  const takenComparison = compareNullableAsc(left.takenAtMs, right.takenAtMs);
  if (takenComparison !== 0) {
    return takenComparison;
  }

  const createdComparison = compareNullableAsc(
    left.createdAtMs,
    right.createdAtMs,
  );
  if (createdComparison !== 0) {
    return createdComparison;
  }

  return left.id.localeCompare(right.id);
}

export function buildGrowthTimeline(
  data: Pick<PlantWithRelations, "photos" | "logs"> | null | undefined,
): GrowthTimelineItem[] {
  if (!data) {
    return [];
  }

  const seenPhotoIds = new Set<string>();

  return [...data.photos]
    .filter((photo) => {
      if (seenPhotoIds.has(photo.id)) {
        return false;
      }

      seenPhotoIds.add(photo.id);
      return resolveGrowthTimelinePhotoRole(photo) === "progress";
    })
    .map((photo) => {
      const imageUri = resolveGrowthTimelinePhotoUri(photo);
      const timestamp = resolveGrowthTimelinePhotoTimestamp(photo);

      if (!imageUri || !timestamp) {
        return null;
      }

      const nearestLog = findClosestLog(data.logs, timestamp);

      return {
        id: photo.id,
        imageUri,
        timestamp,
        capturedAtMs: toTimestamp(normalizeIsoTimestamp(photo.capturedAt)),
        takenAtMs: toTimestamp(normalizeIsoTimestamp(photo.takenAt)),
        createdAtMs: toTimestamp(normalizeIsoTimestamp(photo.createdAt)),
        associatedLog: nearestLog
          ? {
              id: nearestLog.id,
              loggedAt: nearestLog.loggedAt,
              title: getLogTitle(nearestLog),
              body: getLogBody(nearestLog),
            }
          : null,
        caption: photo.caption?.trim() || null,
      } satisfies ResolvedTimelinePhoto;
    })
    .filter((item): item is ResolvedTimelinePhoto => item != null)
    .sort(compareTimelinePhotos)
    .map((item) => ({
      id: item.id,
      imageUri: item.imageUri,
      timestamp: item.timestamp,
      dateLabel: formatTimelineDate(item.timestamp),
      associatedLog: item.associatedLog,
      caption: item.caption,
    }));
}

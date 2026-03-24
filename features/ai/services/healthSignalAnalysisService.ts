import type { HealthInsight, HealthSignalSummary } from "@/features/ai/types/ai";
import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import type { Photo, PlantWithRelations } from "@/types/models";

export const HEALTH_INSIGHT_SHOW_THRESHOLD = 0.68;
export const HEALTH_INSIGHT_NEUTRAL_THRESHOLD = 0.58;

type HealthClassification = "growth" | "dryness" | "stable" | "unclear";

export interface HealthSignalAnalysis {
  classification: HealthClassification;
  confidence: number;
  signalSummary: HealthSignalSummary;
  localInsight: Omit<HealthInsight, "source"> | null;
}

function daysBetween(later: string, earlier: string) {
  return Math.round(
    (new Date(later).getTime() - new Date(earlier).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

function daysSince(value?: string | null) {
  if (!value) {
    return null;
  }

  return Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000)),
  );
}

function getPhotoTimestamp(photo: Photo) {
  return photo.takenAt ?? photo.createdAt ?? photo.updatedAt;
}

function getRenderablePhotos(data: PlantWithRelations) {
  return [...data.photos]
    .filter((photo) => photo.localUri || photo.remoteUrl)
    .sort((left, right) =>
      getPhotoTimestamp(right).localeCompare(getPhotoTimestamp(left)),
    );
}

function detectNoteSignal(notes: string[], pattern: RegExp) {
  return notes.filter((note) => pattern.test(note)).length;
}

function computeCareRhythm(input: {
  daysSinceLastWater: number | null;
  overdueByDays: number | null;
  wateringIntervalDays: number;
}) {
  if (input.daysSinceLastWater === null) {
    return "unknown" as const;
  }

  if ((input.overdueByDays ?? 0) >= 2) {
    return "overdue" as const;
  }

  if (input.daysSinceLastWater <= input.wateringIntervalDays + 1) {
    return "steady" as const;
  }

  return "mixed" as const;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(0.99, Number(score.toFixed(2))));
}

function buildSignalSummary(data: PlantWithRelations) {
  const photos = getRenderablePhotos(data);
  const notes = data.logs
    .slice(0, 6)
    .map((log) => parseStructuredCareLogNote(log.notes).body)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const recentLogs = data.logs.filter(
    (log) => daysSince(log.loggedAt) !== null && (daysSince(log.loggedAt) ?? 99) <= 21,
  );
  const latestPhoto = photos[0];
  const previousPhoto = photos[1];
  const daysBetweenLatestPhotos =
    latestPhoto && previousPhoto
      ? daysBetween(getPhotoTimestamp(latestPhoto), getPhotoTimestamp(previousPhoto))
      : null;
  const daysSinceLatestPhoto = latestPhoto ? daysSince(getPhotoTimestamp(latestPhoto)) : null;
  const recentWaterLog = data.logs.find((log) => log.logType === "water");
  const daysSinceLastWater = recentWaterLog ? daysSince(recentWaterLog.loggedAt) : null;
  const overdueByDays = data.plant.nextWaterDueAt
    ? Math.max(0, daysSince(data.plant.nextWaterDueAt) ?? 0)
    : null;
  const growthCount = detectNoteSignal(
    notes,
    /\bnew growth|new leaf|unfurl|sprout|fresh growth|steady growth\b/i,
  );
  const drynessCount = detectNoteSignal(
    notes,
    /\bdry|dryness|yellow|yellowing|brown edge|crispy|droop|curl/i,
  );
  const stableCount = detectNoteSignal(
    notes,
    /\bstable|steady|holding|unchanged|consistent\b/i,
  );
  const contradictionCount =
    growthCount > 0 && drynessCount > 0 ? 1 : 0;

  let dominantSignal: HealthSignalSummary["dominantSignal"] = "unclear";
  if (growthCount > drynessCount && growthCount > 0) {
    dominantSignal = "growth";
  } else if (drynessCount > growthCount && drynessCount > 0) {
    dominantSignal = "dryness";
  } else if (photos.length >= 2 || stableCount > 0) {
    dominantSignal = "stable";
  }

  return {
    summary: {
      photoHistoryCount: photos.length,
      recentPhotoCount: photos.filter(
        (photo) => (daysSince(getPhotoTimestamp(photo)) ?? 99) <= 21,
      ).length,
      recentLogCount: recentLogs.length,
      daysBetweenLatestPhotos,
      daysSinceLatestPhoto,
      daysSinceLastWater,
      careRhythm: computeCareRhythm({
        daysSinceLastWater,
        overdueByDays,
        wateringIntervalDays: data.plant.wateringIntervalDays,
      }),
      contradictionCount,
      dominantSignal,
    } satisfies HealthSignalSummary,
    notes,
    overdueByDays,
    growthCount,
    drynessCount,
    stableCount,
  };
}

export function buildHealthSignalAnalysis(data: PlantWithRelations): HealthSignalAnalysis {
  const { summary, overdueByDays, growthCount, drynessCount, stableCount } =
    buildSignalSummary(data);

  let confidence = 0;
  if (summary.photoHistoryCount >= 2) {
    confidence += 0.18;
  }
  if (summary.photoHistoryCount >= 3) {
    confidence += 0.08;
  }
  if (
    summary.daysBetweenLatestPhotos !== null &&
    summary.daysBetweenLatestPhotos >= 5 &&
    summary.daysBetweenLatestPhotos <= 30
  ) {
    confidence += 0.12;
  }
  if (
    summary.daysSinceLatestPhoto !== null &&
    summary.daysSinceLatestPhoto <= 14
  ) {
    confidence += 0.1;
  }
  if (summary.recentLogCount >= 2) {
    confidence += 0.12;
  }
  if (summary.careRhythm === "steady") {
    confidence += 0.1;
  }
  if (summary.careRhythm === "overdue") {
    confidence += 0.04;
  }
  if (summary.dominantSignal === "growth") {
    confidence += 0.18;
  }
  if (summary.dominantSignal === "dryness") {
    confidence += 0.16;
  }
  if (summary.dominantSignal === "stable") {
    confidence += 0.08;
  }
  confidence -= summary.contradictionCount * 0.14;

  let classification: HealthClassification = "unclear";
  let localInsight: Omit<HealthInsight, "source"> | null = null;

  if (
    summary.dominantSignal === "growth" &&
    growthCount > 0 &&
    summary.photoHistoryCount >= 2
  ) {
    classification = "growth";
    localInsight = {
      title: "Health insight",
      body: "Recent photos suggest steady new growth over the past two weeks.",
      confidence: clampScore(confidence),
      classification: "growth",
      signalSummary: summary,
    };
  } else if (
    summary.dominantSignal === "dryness" &&
    drynessCount > 0 &&
    summary.photoHistoryCount >= 2
  ) {
    classification = "dryness";
    localInsight = {
      title: "Health insight",
      body:
        summary.careRhythm === "overdue" || (overdueByDays ?? 0) >= 2
          ? "Leaf edges may be showing mild dryness. Consider checking your watering rhythm."
          : "Recent photos suggest mild dryness along the leaf edges.",
      confidence: clampScore(confidence),
      classification: "dryness",
      signalSummary: summary,
    };
  } else if (
    summary.photoHistoryCount >= 2 &&
    summary.daysSinceLatestPhoto !== null &&
    summary.daysSinceLatestPhoto <= 21
  ) {
    classification = "stable";
    localInsight = {
      title: "Health insight",
      body:
        stableCount > 0 || summary.recentLogCount >= 2
          ? "Your recent entries suggest stable condition with no obvious change."
          : "Recent photos suggest stable condition.",
      confidence: clampScore(confidence),
      classification: "stable",
      signalSummary: summary,
    };
  }

  return {
    classification,
    confidence: clampScore(confidence),
    signalSummary: summary,
    localInsight,
  };
}

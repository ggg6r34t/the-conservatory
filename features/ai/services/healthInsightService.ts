import { requestHealthInsight } from "@/features/ai/api/aiClient";
import { withHealthInsightSource } from "@/features/ai/schemas/aiMappers";
import { parseHealthInsightResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { enforceHealthInsightSafety } from "@/features/ai/services/healthInsightSafetyService";
import { buildHealthSignalAnalysis } from "@/features/ai/services/healthSignalAnalysisService";
import type { HealthInsight } from "@/features/ai/types/ai";
import type { PlantWithRelations } from "@/types/models";

const HEALTH_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function buildHealthInsightCacheKey(plantId: string, revision: string) {
  return `ai:health:${plantId}:${revision}`;
}

function getRenderablePhotos(data: PlantWithRelations) {
  return data.photos.filter((photo) => photo.localUri || photo.remoteUrl);
}

export function buildHealthInsightRevision(data: PlantWithRelations) {
  return [
    data.photos.length,
    data.photos[0]?.updatedAt ?? "none",
    data.logs.length,
    data.logs[0]?.updatedAt ?? "none",
  ].join(":");
}

export async function getHealthInsight(input: {
  plantId: string;
  data: PlantWithRelations;
}) {
  const revision = buildHealthInsightRevision(input.data);
  const cacheKey = buildHealthInsightCacheKey(input.plantId, revision);
  const cached = await getCachedValue<HealthInsight>(cacheKey);
  if (cached) {
    return cached;
  }

  const analysis = buildHealthSignalAnalysis(input.data);
  const fallback = enforceHealthInsightSafety({
    insight: analysis.localInsight,
    analysis,
  });

  if (!fallback) {
    return null;
  }

  const cloud = await requestHealthInsight({
    plantId: input.plantId,
    speciesName: input.data.plant.speciesName,
    photoUris: getRenderablePhotos(input.data)
      .slice(0, 4)
      .map((photo) => photo.localUri ?? photo.remoteUrl ?? "")
      .filter(Boolean),
    recentLogNotes: input.data.logs
      .slice(0, 5)
      .map((log) => log.notes?.trim() ?? "")
      .filter(Boolean),
    careSummary: {
      wateringIntervalDays: input.data.plant.wateringIntervalDays,
      daysSinceLastWater: analysis.signalSummary.daysSinceLastWater,
      overdueByDays: input.data.plant.nextWaterDueAt
        ? Math.max(
            0,
            Math.round(
              (Date.now() -
                new Date(input.data.plant.nextWaterDueAt).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : null,
      reminderCount: input.data.reminders.length,
    },
    localAnalysis: {
      confidence: analysis.confidence,
      classification: analysis.classification,
      signalSummary: analysis.signalSummary,
    },
    fallback,
  });
  const parsedCloud = parseHealthInsightResponse(cloud);
  const safeCloud = enforceHealthInsightSafety({
    insight: parsedCloud,
    analysis,
  });
  const safeFallback = enforceHealthInsightSafety({
    insight: fallback,
    analysis,
  });
  const chosen = safeCloud ?? safeFallback;

  if (!chosen) {
    return null;
  }

  const insight = withHealthInsightSource(
    chosen,
    safeCloud ? "cloud" : "local",
  );

  await setCachedValue(cacheKey, insight, HEALTH_CACHE_TTL_MS);
  return insight;
}

import { requestJournalSummary } from "@/features/ai/api/aiClient";
import {
  buildMonthKey,
  withSummarySource,
} from "@/features/ai/schemas/aiMappers";
import { parseJournalSummaryResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { selectDeterministicVariant } from "@/features/ai/services/editorialVoiceService";
import type { JournalMonthlySummary } from "@/features/ai/types/ai";
import type { CareLog, Plant } from "@/types/models";

const MONTH_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function buildJournalCacheKey(userId: string, monthKey: string) {
  return `ai:journal:${userId}:${monthKey}`;
}

function inMonth(value: string, monthKey: string) {
  return value.startsWith(monthKey);
}

export function buildLocalMonthlySummary(input: {
  monthKey: string;
  logs: CareLog[];
  photoCount: number;
  plantsById: Map<string, Plant>;
}): Omit<JournalMonthlySummary, "monthKey" | "source"> | null {
  const monthLogs = input.logs.filter((log) =>
    inMonth(log.loggedAt, input.monthKey),
  );

  if (monthLogs.length < 2) {
    return null;
  }

  const wateredCount = monthLogs.filter(
    (log) => log.logType === "water",
  ).length;
  const mostActivePlantId = monthLogs.reduce<Record<string, number>>(
    (acc, log) => {
      acc[log.plantId] = (acc[log.plantId] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const topPlantId = Object.entries(mostActivePlantId).sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0];
  const topPlantName = topPlantId
    ? input.plantsById.get(topPlantId)?.name
    : null;

  const body =
    wateredCount >= 3
      ? selectDeterministicVariant(
          [
            `You kept a steady hand this month with ${wateredCount} watering moments across the collection.${topPlantName ? ` ${topPlantName} asked for the most attention.` : ""}`,
            `This month settled into a steady care rhythm, with ${wateredCount} watering entries recorded.${topPlantName ? ` ${topPlantName} appeared most often in the journal.` : ""}`,
          ],
          `${input.monthKey}:${wateredCount}:${topPlantName ?? "none"}:watered`,
        )
      : selectDeterministicVariant(
          [
            `This month stayed light, with ${monthLogs.length} care moments recorded.${topPlantName ? ` ${topPlantName} ran most clearly through the journal.` : ""}`,
            `The journal moved at an even pace this month, with ${monthLogs.length} care entries overall.${topPlantName ? ` ${topPlantName} remained the clearest thread.` : ""}`,
          ],
          `${input.monthKey}:${monthLogs.length}:${topPlantName ?? "none"}:light`,
        );

  const closing =
    input.photoCount > 0
      ? selectDeterministicVariant(
          [
            " The archive carries a little more texture than it did at the start.",
            " The archive now holds a slightly fuller record of the month.",
          ],
          `${input.monthKey}:${input.photoCount}:closing`,
        )
      : "";

  return {
    title: "Monthly reflection",
    body: `${body}${closing}`.trim(),
  };
}

export async function getJournalMonthlySummary(input: {
  userId: string;
  logs: CareLog[];
  plants: Plant[];
  photoCount: number;
  now?: Date;
}) {
  const monthKey = buildMonthKey(input.now);
  const cacheKey = buildJournalCacheKey(input.userId, monthKey);
  const cached = await getCachedValue<JournalMonthlySummary>(cacheKey);
  if (cached) {
    return cached;
  }

  const plantsById = new Map(input.plants.map((plant) => [plant.id, plant]));
  const fallback = buildLocalMonthlySummary({
    monthKey,
    logs: input.logs,
    photoCount: input.photoCount,
    plantsById,
  });

  if (!fallback) {
    return null;
  }

  const monthLogs = input.logs.filter((log) => inMonth(log.loggedAt, monthKey));
  const mostActivePlantId = monthLogs.reduce<Record<string, number>>(
    (acc, log) => {
      acc[log.plantId] = (acc[log.plantId] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const topPlantId = Object.entries(mostActivePlantId).sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0];

  const cloud = await requestJournalSummary({
    monthKey,
    summary: {
      logCount: monthLogs.length,
      wateredCount: monthLogs.filter((log) => log.logType === "water").length,
      photoCount: input.photoCount,
      activePlantCount: input.plants.length,
      mostActivePlantName: topPlantId
        ? plantsById.get(topPlantId)?.name
        : undefined,
    },
    fallback,
  });
  const parsedCloud = parseJournalSummaryResponse(cloud);
  const summary = parsedCloud
    ? withSummarySource(parsedCloud, monthKey, "cloud")
    : withSummarySource(fallback, monthKey, "local");

  await setCachedValue(cacheKey, summary, MONTH_CACHE_TTL_MS);
  return summary;
}

import { requestCareScheduleSuggestions } from "@/features/ai/api/aiClient";
import { hasVerifiedModelGeneration } from "@/features/ai/schemas/aiGenerationMeta";
import { parseCareScheduleSuggestionsResponse } from "@/features/ai/schemas/aiValidators";
import type {
  CareSchedulePlantContext,
  GenerateCareScheduleRequest,
} from "@/features/ai/types/ai";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { resolveSpeciesProfile } from "@/features/ai/services/careDefaultsService";
import { trackAiFeatureUsed } from "@/services/analytics/analyticsService";
import { isReminderCareType } from "@/features/notifications/constants/reminderTypes";
import {
  generateRecurringDueDates,
  toLocalDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import type {
  CareCalendarCareType,
  CareCalendarConfidence,
  CareCalendarEvent,
  CareScheduleSuggestion,
  CareSuggestionDerivation,
} from "@/features/care-calendar/types";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { derivePlantStatus } from "@/features/plants/services/plantStatusService";
import type { CareLog, CareReminder } from "@/types/models";

const SUGGESTION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const HORIZON_DAYS = 45;

function addLocalDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function buildDismissedCacheKey(userId: string) {
  return `care_schedule_dismissed:${userId}`;
}

function buildSuggestionCacheKey(userId: string, signature: string) {
  return `care_schedule_suggestions:${userId}:${signature}`;
}

function buildSignature(plantIds: string[]) {
  return [...plantIds].sort().join(",");
}

function speciesWantsMisting(speciesName: string) {
  const normalized = speciesName.toLowerCase();
  return (
    normalized.includes("fern") ||
    normalized.includes("calathea") ||
    normalized.includes("peace lily") ||
    normalized.includes("spathiphyllum")
  );
}

function getLatestLogByType(logs: CareLog[], careType: CareCalendarCareType) {
  return logs
    .filter((log) => {
      if (careType === "pest_check") {
        return log.logType === "pest";
      }

      return log.logType === careType;
    })
    .sort(
      (left, right) =>
        new Date(right.loggedAt).getTime() - new Date(left.loggedAt).getTime(),
    )[0];
}

function hasReminderConflict(input: {
  reminders: CareReminder[];
  plantId: string;
  careType: CareCalendarCareType;
  suggestedDateKey: string;
}) {
  const reminderType = isReminderCareType(input.careType) ? input.careType : null;

  if (
    reminderType !== "water" &&
    reminderType !== "mist" &&
    reminderType !== "feed"
  ) {
    return false;
  }

  return input.reminders.some((reminder) => {
    if (
      reminder.plantId !== input.plantId ||
      reminder.reminderType !== reminderType ||
      !reminder.enabled ||
      !reminder.nextDueAt
    ) {
      return false;
    }

    const reminderKey = toLocalDateKey(reminder.nextDueAt);
    const delta = Math.abs(
      new Date(`${input.suggestedDateKey}T12:00:00`).getTime() -
        new Date(`${reminderKey}T12:00:00`).getTime(),
    );

    return delta <= 2 * 24 * 60 * 60 * 1000;
  });
}

export function buildLocalCareScheduleSuggestions(input: {
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
  dismissedIds?: string[];
  now?: Date;
}): CareScheduleSuggestion[] {
  const now = input.now ?? new Date();
  const horizonEnd = addLocalDays(now, HORIZON_DAYS);
  const dismissed = new Set(input.dismissedIds ?? []);
  const suggestions: CareScheduleSuggestion[] = [];

  for (const plant of input.plants.filter((candidate) => candidate.status === "active")) {
    const plantReminders = input.reminders.filter(
      (reminder) => reminder.plantId === plant.id,
    );
    const plantLogs = input.logs.filter((log) => log.plantId === plant.id);
    const status = derivePlantStatus({
      plant,
      reminders: plantReminders,
      logs: plantLogs,
      now,
    });
    const profile = resolveSpeciesProfile(plant.speciesName);

    const hasMistReminder = plantReminders.some(
      (reminder) => reminder.reminderType === "mist" && reminder.enabled,
    );

    if (speciesWantsMisting(plant.speciesName) && !hasMistReminder) {
      const suggestedDueDate = toLocalDateKey(addLocalDays(now, 3));
      const suggestionId = `suggest:${plant.id}:mist:${suggestedDueDate}`;

      if (!dismissed.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          plantId: plant.id,
          plantName: plant.name,
          careType: "mist",
          suggestedDueDate,
          frequencyDays: 3,
          confidence: "medium",
          reason:
            "Based on species and moisture preference, gentle misting every few days may help leaf edges stay calm.",
        });
      }
    }

    const wateringLogs = plantLogs.filter((log) => log.logType === "water");
    if (wateringLogs.length >= 2 && status.daysSinceWatered != null) {
      const intervals: number[] = [];
      const sorted = [...wateringLogs].sort(
        (left, right) =>
          new Date(left.loggedAt).getTime() - new Date(right.loggedAt).getTime(),
      );

      for (let index = 1; index < sorted.length; index += 1) {
        const delta = Math.round(
          (new Date(sorted[index].loggedAt).getTime() -
            new Date(sorted[index - 1].loggedAt).getTime()) /
            (24 * 60 * 60 * 1000),
        );
        if (delta > 0) {
          intervals.push(delta);
        }
      }

      if (intervals.length > 0) {
        const averageInterval = Math.round(
          intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
        );
        const plantInterval = plant.wateringIntervalDays;
        const drift = Math.abs(averageInterval - plantInterval);

        if (drift >= 2 && averageInterval >= 3) {
          const suggestedDueDate = toLocalDateKey(
            addLocalDays(now, Math.max(1, averageInterval - status.daysSinceWatered)),
          );
          const suggestionId = `suggest:${plant.id}:water:${suggestedDueDate}`;

          if (!dismissed.has(suggestionId)) {
            suggestions.push({
              id: suggestionId,
              plantId: plant.id,
              plantName: plant.name,
              careType: "water",
              suggestedDueDate,
              frequencyDays: averageInterval,
              confidence: drift >= 4 ? "medium" : "low",
              reason: `Based on your recent watering rhythm, a ${averageInterval}-day cycle may suit this plant better than ${plantInterval} days.`,
            });
          }
        }
      }
    }

    const latestRepot = getLatestLogByType(plantLogs, "repot");
    if (latestRepot) {
      const monthsSince = Math.round(
        (now.getTime() - new Date(latestRepot.loggedAt).getTime()) /
          (30 * 24 * 60 * 60 * 1000),
      );
      if (monthsSince >= 10) {
        const suggestedDueDate = toLocalDateKey(addLocalDays(now, 14));
        const suggestionId = `suggest:${plant.id}:repot:${suggestedDueDate}`;
        if (!dismissed.has(suggestionId)) {
          suggestions.push({
            id: suggestionId,
            plantId: plant.id,
            plantName: plant.name,
            careType: "repot",
            suggestedDueDate,
            frequencyDays: 365,
            confidence: "low",
            reason:
              "It has been a while since the last repot entry. Consider a gentle check before the next growth season.",
          });
        }
      }
    } else if (profile.wateringIntervalDays >= 12) {
      const suggestedDueDate = toLocalDateKey(addLocalDays(now, 21));
      const suggestionId = `suggest:${plant.id}:inspect:${suggestedDueDate}`;
      if (!dismissed.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          plantId: plant.id,
          plantName: plant.name,
          careType: "inspect",
          suggestedDueDate,
          frequencyDays: 30,
          confidence: "low",
          reason: profile.careProfileHint,
        });
      }
    }
  }

  return filterCareScheduleSuggestions(suggestions, {
    reminders: input.reminders,
  });
}

function filterCareScheduleSuggestions(
  suggestions: CareScheduleSuggestion[],
  input: {
    reminders: CareReminder[];
  },
) {
  return suggestions.filter(
    (suggestion) =>
      !hasReminderConflict({
        reminders: input.reminders,
        plantId: suggestion.plantId,
        careType: suggestion.careType,
        suggestedDateKey: suggestion.suggestedDueDate,
      }),
  );
}

export function buildCareScheduleCloudRequest(input: {
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
  fallbackSuggestions: CareScheduleSuggestion[];
  now?: Date;
}): GenerateCareScheduleRequest {
  const now = input.now ?? new Date();

  const plants = input.plants
    .filter((plant) => plant.status === "active")
    .map((plant): CareSchedulePlantContext => {
      const plantReminders = input.reminders.filter(
        (reminder) => reminder.plantId === plant.id,
      );
      const plantLogs = input.logs.filter((log) => log.plantId === plant.id);
      const status = derivePlantStatus({
        plant,
        reminders: plantReminders,
        logs: plantLogs,
        now,
      });
      const profile = resolveSpeciesProfile(plant.speciesName);

      return {
        plantId: plant.id,
        plantName: plant.name,
        speciesName: plant.speciesName,
        wateringIntervalDays: plant.wateringIntervalDays,
        daysSinceWatered: status.daysSinceWatered,
        healthStatus: status.healthState,
        enabledReminderTypes: plantReminders
          .filter((reminder) => reminder.enabled)
          .map((reminder) => reminder.reminderType),
        recentCareTypes: Array.from(
          new Set(
            plantLogs
              .slice()
              .sort(
                (left, right) =>
                  new Date(right.loggedAt).getTime() -
                  new Date(left.loggedAt).getTime(),
              )
              .slice(0, 8)
              .map((log) => log.logType),
          ),
        ),
        speciesCareHint: profile.careProfileHint,
      };
    });

  return {
    horizonDays: HORIZON_DAYS,
    plants,
    fallbackSuggestions: input.fallbackSuggestions.map((suggestion) => ({
      plantId: suggestion.plantId,
      plantName: suggestion.plantName,
      careType: suggestion.careType,
      suggestedDueDate: suggestion.suggestedDueDate,
      frequencyDays: suggestion.frequencyDays,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
    })),
  };
}

function normalizeCloudCareScheduleSuggestions(input: {
  raw: ReturnType<typeof parseCareScheduleSuggestionsResponse>;
  plants: PlantListItem[];
  reminders: CareReminder[];
  dismissedIds: string[];
  now: Date;
}): CareScheduleSuggestion[] {
  const plantById = new Map(
    input.plants.map((plant) => [plant.id, plant] as const),
  );
  const dismissed = new Set(input.dismissedIds);
  const horizonEnd = addLocalDays(input.now, HORIZON_DAYS);
  const horizonStartKey = toLocalDateKey(input.now);
  const horizonEndKey = toLocalDateKey(horizonEnd);
  const suggestions: CareScheduleSuggestion[] = [];

  for (const item of input.raw) {
    const plant = plantById.get(item.plantId);
    if (!plant || plant.status !== "active") {
      continue;
    }

    if (
      item.suggestedDueDate < horizonStartKey ||
      item.suggestedDueDate > horizonEndKey
    ) {
      continue;
    }

    const careType = item.careType as CareCalendarCareType;
    const suggestionId = `suggest:${item.plantId}:${careType}:${item.suggestedDueDate}`;
    if (dismissed.has(suggestionId)) {
      continue;
    }

    suggestions.push({
      id: suggestionId,
      plantId: item.plantId,
      plantName: plant.name,
      careType,
      suggestedDueDate: item.suggestedDueDate,
      frequencyDays: item.frequencyDays,
      confidence: item.confidence as CareCalendarConfidence,
      reason: item.reason,
    });
  }

  return filterCareScheduleSuggestions(suggestions, {
    reminders: input.reminders,
  });
}

export function suggestionsToCalendarEvents(
  suggestions: CareScheduleSuggestion[],
  derivation?: CareSuggestionDerivation,
): CareCalendarEvent[] {
  return suggestions.map((suggestion) => ({
    id: suggestion.id,
    plantId: suggestion.plantId,
    plantName: suggestion.plantName,
    careType: suggestion.careType,
    dueDate: suggestion.suggestedDueDate,
    status: "upcoming",
    source: "ai_suggested" as const,
    confidence: suggestion.confidence,
    reason: suggestion.reason,
    isAiSuggested: true,
    suggestionDerivation: derivation,
  }));
}

export async function getDismissedSuggestionIds(userId: string) {
  return (await getCachedValue<string[]>(buildDismissedCacheKey(userId))) ?? [];
}

export async function dismissCareScheduleSuggestion(
  userId: string,
  suggestionId: string,
) {
  const existing = await getDismissedSuggestionIds(userId);
  if (existing.includes(suggestionId)) {
    return;
  }

  await setCachedValue(
    buildDismissedCacheKey(userId),
    [...existing, suggestionId],
    180 * 24 * 60 * 60 * 1000,
  );
}

export async function getCareScheduleSuggestions(input: {
  userId: string;
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
  cloudAllowed: boolean;
  now?: Date;
}): Promise<{
  suggestions: CareScheduleSuggestion[];
  source: "local" | "cached" | "cloud";
}> {
  if (!input.cloudAllowed) {
    return { suggestions: [], source: "local" };
  }

  const now = input.now ?? new Date();
  const activePlants = input.plants.filter((plant) => plant.status === "active");
  const signature = buildSignature(activePlants.map((plant) => plant.id));
  const cacheKey = buildSuggestionCacheKey(input.userId, signature);
  const dismissedIds = await getDismissedSuggestionIds(input.userId);

  const cached = await getCachedValue<CareScheduleSuggestion[]>(cacheKey);
  if (cached) {
    return {
      suggestions: cached.filter(
        (suggestion) => !dismissedIds.includes(suggestion.id),
      ),
      source: "cached",
    };
  }

  const localFallback = buildLocalCareScheduleSuggestions({
    plants: input.plants,
    reminders: input.reminders,
    logs: input.logs,
    dismissedIds,
    now,
  });

  try {
    const cloud = await requestCareScheduleSuggestions(
      buildCareScheduleCloudRequest({
        plants: input.plants,
        reminders: input.reminders,
        logs: input.logs,
        fallbackSuggestions: localFallback,
        now,
      }),
    );
    const parsed = parseCareScheduleSuggestionsResponse(cloud);
    if (hasVerifiedModelGeneration(cloud) && parsed.length > 0) {
      const suggestions = normalizeCloudCareScheduleSuggestions({
        raw: parsed,
        plants: input.plants,
        reminders: input.reminders,
        dismissedIds,
        now,
      });

      if (suggestions.length > 0) {
        await setCachedValue(cacheKey, suggestions, SUGGESTION_CACHE_TTL_MS);
        trackAiFeatureUsed("ai_care_schedule", { source: "cloud" });
        return { suggestions, source: "cloud" };
      }
    }
  } catch {
    // Fall back to on-device heuristics when cloud is unavailable.
  }

  await setCachedValue(cacheKey, localFallback, SUGGESTION_CACHE_TTL_MS);

  return { suggestions: localFallback, source: "local" };
}

export function expandAcceptedSuggestionToEvents(input: {
  suggestion: CareScheduleSuggestion;
  horizonDays?: number;
  now?: Date;
}): CareCalendarEvent[] {
  const now = input.now ?? new Date();
  const horizonEnd = addLocalDays(now, input.horizonDays ?? HORIZON_DAYS);
  const dueDates = generateRecurringDueDates({
    anchorDueAt: `${input.suggestion.suggestedDueDate}T09:00:00`,
    frequencyDays: input.suggestion.frequencyDays,
    horizonEnd,
  });

  return dueDates.map((dueDateKey) => ({
    id: `${input.suggestion.id}:${dueDateKey}`,
    plantId: input.suggestion.plantId,
    plantName: input.suggestion.plantName,
    careType: input.suggestion.careType,
    dueDate: dueDateKey,
    status: "upcoming" as const,
    source: "ai_suggested" as const,
    confidence: input.suggestion.confidence,
    reason: input.suggestion.reason,
    isAiSuggested: true,
  }));
}

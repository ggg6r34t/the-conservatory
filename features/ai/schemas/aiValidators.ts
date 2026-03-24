import { z } from "zod";

import {
  clampConfidence,
  normalizeSpeciesLabel,
} from "@/features/ai/schemas/aiMappers";
import type {
  ArchiveCuratedPair,
  DashboardInsight,
  GenerateDashboardInsightResponse,
  GenerateHealthInsightResponse,
  GenerateJournalSummaryResponse,
  GenerateStreakNudgeResponse,
  HealthInsight,
  IdentifyPlantResponse,
  JournalMonthlySummary,
  OptimizedReminderTiming,
  RefineCareLogResponse,
  RefinedCareLogSuggestion,
  SpeciesSuggestion,
  StreakRecoveryNudge,
} from "@/features/ai/types/ai";

const speciesSuggestionSchema = z.object({
  species: z.string().min(1).transform(normalizeSpeciesLabel),
  confidence: z.number().transform(clampConfidence),
  careProfileHint: z.string().trim().min(1).optional(),
});

const dashboardInsightSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(220),
  plantId: z.string().trim().min(1).optional(),
});

const journalSummarySchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(220),
});

const healthInsightSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(220),
  confidence: z.number().transform(clampConfidence),
  classification: z.enum(["growth", "dryness", "stable"]).optional(),
  signalSummary: z
    .object({
      photoHistoryCount: z.number().int().nonnegative(),
      recentPhotoCount: z.number().int().nonnegative(),
      recentLogCount: z.number().int().nonnegative(),
      daysBetweenLatestPhotos: z.number().int().nullable(),
      daysSinceLatestPhoto: z.number().int().nullable(),
      daysSinceLastWater: z.number().int().nullable(),
      careRhythm: z.enum(["steady", "overdue", "mixed", "unknown"]),
      contradictionCount: z.number().int().nonnegative(),
      dominantSignal: z.enum(["growth", "dryness", "stable", "unclear"]),
    })
    .optional(),
});

const observationTagSchema = z.enum([
  "new growth",
  "yellowing leaves",
  "dry soil",
  "pest concern",
  "pruning",
  "stable condition",
]);

const refinedCareLogSchema = z.object({
  refinedNote: z.string().trim().min(1).max(280).nullable(),
  suggestedTags: z.array(observationTagSchema).max(6),
});

const archivePairSchema = z.object({
  plantId: z.string().trim().min(1),
  plantName: z.string().trim().min(1).max(80),
  beforeUri: z.string().trim().min(1),
  afterUri: z.string().trim().min(1),
  caption: z.string().trim().min(1).max(160),
});

const streakNudgeSchema = z.object({
  body: z.string().trim().min(1).max(180),
});

const reminderTimingSchema = z.object({
  nextDueAt: z.string().datetime().nullable(),
  explanation: z.string().trim().min(1).nullable(),
  shouldSchedule: z.boolean(),
});

export function parseSpeciesSuggestionResponse(
  response: IdentifyPlantResponse | null | undefined,
): Omit<SpeciesSuggestion, "source"> | null {
  const parsed = speciesSuggestionSchema.safeParse(response?.suggestion);
  return parsed.success ? parsed.data : null;
}

export function parseDashboardInsightResponse(
  response: GenerateDashboardInsightResponse | null | undefined,
): Omit<DashboardInsight, "source"> | null {
  const parsed = dashboardInsightSchema.safeParse(response?.insight);
  return parsed.success ? parsed.data : null;
}

export function parseJournalSummaryResponse(
  response: GenerateJournalSummaryResponse | null | undefined,
): Omit<JournalMonthlySummary, "monthKey" | "source"> | null {
  const parsed = journalSummarySchema.safeParse(response?.summary);
  return parsed.success ? parsed.data : null;
}

export function parseHealthInsightResponse(
  response: GenerateHealthInsightResponse | null | undefined,
): Omit<HealthInsight, "source"> | null {
  const parsed = healthInsightSchema.safeParse(response?.insight);
  return parsed.success ? parsed.data : null;
}

export function parseRefinedCareLogResponse(
  response: RefineCareLogResponse | null | undefined,
): Omit<RefinedCareLogSuggestion, "source"> | null {
  const parsed = refinedCareLogSchema.safeParse(response?.suggestion);
  return parsed.success ? parsed.data : null;
}

export function parseArchiveCurationResponse(
  response:
    | {
        pairs?: Omit<ArchiveCuratedPair, "source">[] | null;
      }
    | null
    | undefined,
): Omit<ArchiveCuratedPair, "source">[] {
  const parsed = z.array(archivePairSchema).safeParse(response?.pairs ?? []);
  return parsed.success ? parsed.data : [];
}

export function parseStreakNudgeResponse(
  response: GenerateStreakNudgeResponse | null | undefined,
): Omit<StreakRecoveryNudge, "source"> | null {
  const parsed = streakNudgeSchema.safeParse(response?.nudge);
  return parsed.success ? parsed.data : null;
}

export function parseReminderOptimizationResponse(
  response: { result?: OptimizedReminderTiming | null } | null | undefined,
): OptimizedReminderTiming | null {
  const parsed = reminderTimingSchema.safeParse(response?.result);
  return parsed.success ? parsed.data : null;
}

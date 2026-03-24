import type {
  ArchiveCuratedPair,
  DashboardInsight,
  HealthInsight,
  JournalMonthlySummary,
  RefinedCareLogSuggestion,
  SpeciesSuggestion,
  StreakRecoveryNudge,
} from "@/features/ai/types/ai";

export function clampConfidence(value: number) {
  return Math.min(0.99, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function normalizeSpeciesLabel(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function createCacheKeyHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export function buildDayKey(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export function buildMonthKey(value = new Date()) {
  return value.toISOString().slice(0, 7);
}

export function withInsightSource(
  insight: Omit<DashboardInsight, "source">,
  source: DashboardInsight["source"],
): DashboardInsight {
  return { ...insight, source };
}

export function withHealthInsightSource(
  insight: Omit<HealthInsight, "source">,
  source: HealthInsight["source"],
): HealthInsight {
  return { ...insight, source };
}

export function withSummarySource(
  summary: Omit<JournalMonthlySummary, "source" | "monthKey">,
  monthKey: string,
  source: JournalMonthlySummary["source"],
): JournalMonthlySummary {
  return { ...summary, monthKey, source };
}

export function withSpeciesSource(
  suggestion: Omit<SpeciesSuggestion, "source">,
  source: SpeciesSuggestion["source"],
): SpeciesSuggestion {
  return { ...suggestion, source };
}

export function withRefinedCareLogSource(
  suggestion: Omit<RefinedCareLogSuggestion, "source">,
  source: RefinedCareLogSuggestion["source"],
): RefinedCareLogSuggestion {
  return { ...suggestion, source };
}

export function withCuratedArchivePairSource(
  pair: Omit<ArchiveCuratedPair, "source">,
  source: ArchiveCuratedPair["source"],
): ArchiveCuratedPair {
  return { ...pair, source };
}

export function withStreakNudgeSource(
  nudge: Omit<StreakRecoveryNudge, "source">,
  source: StreakRecoveryNudge["source"],
): StreakRecoveryNudge {
  return { ...nudge, source };
}

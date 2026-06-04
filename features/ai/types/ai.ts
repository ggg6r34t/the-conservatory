export type AiSource = "local" | "cloud";

export type AiProviderId = "openai" | "anthropic" | "google";

export interface AiGenerationMeta {
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export type LightCondition = "low" | "indirect" | "direct";

export interface SpeciesSuggestion {
  species: string;
  confidence: number;
  careProfileHint?: string;
  confidenceExplanation?: string;
  source: AiSource;
  generation?: AiGenerationMeta;
}

export interface IdentifyPlantRequest {
  imageUri: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface IdentifyPlantResponse {
  suggestion: SpeciesSuggestion | null;
}

export interface CareDefaultsSuggestion {
  wateringIntervalDays: number;
  lightSummary: string;
  careProfileHint: string;
  explanation: string;
}

export interface ReminderOptimizationInput {
  plantName: string;
  speciesName: string;
  wateringIntervalDays: number;
  nextDueAt: string | null;
  lastWateredAt?: string | null;
  lastTriggeredAt?: string | null;
  reminderEnabled: boolean;
  defaultWateringHour: number;
  now?: Date;
}

export interface OptimizedReminderTiming {
  nextDueAt: string | null;
  explanation: string | null;
  shouldSchedule: boolean;
}

export type OptimizeRemindersRequest = ReminderOptimizationInput;

export interface OptimizeRemindersResponse {
  result: OptimizedReminderTiming;
}

export interface DashboardInsight {
  title: string;
  body: string;
  plantId?: string;
  source: AiSource;
}

export interface GenerateDashboardInsightRequest {
  summary: {
    activePlantCount: number;
    duePlantCount: number;
    overduePlantCount: number;
    soonestPlantName?: string;
    currentStreakDays: number;
  };
  fallback: Omit<DashboardInsight, "source">;
}

export interface GenerateDashboardInsightResponse {
  insight: Omit<DashboardInsight, "source"> | null;
  meta?: AiGenerationMeta;
}

export interface JournalMonthlySummary {
  title: string;
  body: string;
  monthKey: string;
  source: AiSource;
}

export interface HealthInsight {
  title: string;
  body: string;
  confidence: number;
  classification?: "growth" | "dryness" | "stable";
  signalSummary?: HealthSignalSummary;
  source: AiSource;
}

export interface HealthSignalSummary {
  photoHistoryCount: number;
  recentPhotoCount: number;
  recentLogCount: number;
  daysBetweenLatestPhotos: number | null;
  daysSinceLatestPhoto: number | null;
  daysSinceLastWater: number | null;
  careRhythm: "steady" | "overdue" | "mixed" | "unknown";
  contradictionCount: number;
  dominantSignal: "growth" | "dryness" | "stable" | "unclear";
}

export interface GenerateHealthInsightRequest {
  plantId: string;
  speciesName: string;
  photoUris: string[];
  recentLogNotes: string[];
  careSummary: {
    wateringIntervalDays: number;
    daysSinceLastWater: number | null;
    overdueByDays: number | null;
    reminderCount: number;
  };
  localAnalysis: {
    confidence: number;
    classification: "growth" | "dryness" | "stable" | "unclear";
    signalSummary: HealthSignalSummary;
  };
  fallback: Omit<HealthInsight, "source"> | null;
}

export interface GenerateHealthInsightResponse {
  insight: Omit<HealthInsight, "source"> | null;
  meta?: AiGenerationMeta;
}

export type ObservationTag =
  | "new growth"
  | "yellowing leaves"
  | "dry soil"
  | "pest concern"
  | "pruning"
  | "stable condition";

export interface RefinedCareLogSuggestion {
  refinedNote: string | null;
  suggestedTags: ObservationTag[];
  source: AiSource;
}

export interface RefineCareLogRequest {
  note: string;
  logType: string;
  fallback: Omit<RefinedCareLogSuggestion, "source">;
}

export interface RefineCareLogResponse {
  suggestion: Omit<RefinedCareLogSuggestion, "source"> | null;
}

export interface ArchiveCuratedPair {
  plantId: string;
  plantName: string;
  beforeUri: string;
  afterUri: string;
  beforePhotoId?: string | null;
  afterPhotoId?: string | null;
  candidatePhotos?: {
    id: string;
    uri: string;
  }[];
  caption: string;
  source: AiSource;
}

export interface CurateArchiveGalleryRequest {
  items: {
    plantId: string;
    plantName: string;
    photoUris: string[];
  }[];
}

export interface CurateArchiveGalleryResponse {
  pairs: Omit<ArchiveCuratedPair, "source">[];
  meta?: AiGenerationMeta;
}

export interface StreakRecoveryNudge {
  body: string;
  source: AiSource;
}

export interface GenerateStreakNudgeRequest {
  summary: {
    currentStreakDays: number;
    overdueCount: number;
    dueSoonCount: number;
    daysSinceLastLog: number | null;
  };
  fallback: Omit<StreakRecoveryNudge, "source"> | null;
}

export interface GenerateStreakNudgeResponse {
  nudge: Omit<StreakRecoveryNudge, "source"> | null;
}

export interface GenerateJournalSummaryRequest {
  monthKey: string;
  summary: {
    logCount: number;
    wateredCount: number;
    photoCount: number;
    activePlantCount: number;
    mostActivePlantName?: string;
  };
  fallback: Omit<JournalMonthlySummary, "monthKey" | "source">;
}

export interface GenerateJournalSummaryResponse {
  summary: Omit<JournalMonthlySummary, "monthKey" | "source"> | null;
  meta?: AiGenerationMeta;
}

export interface CareSchedulePlantContext {
  plantId: string;
  plantName: string;
  speciesName: string;
  wateringIntervalDays: number;
  daysSinceWatered: number | null;
  healthStatus: string;
  enabledReminderTypes: string[];
  recentCareTypes: string[];
  speciesCareHint?: string;
}

export interface CareScheduleSuggestionPayload {
  plantId: string;
  plantName: string;
  careType: string;
  suggestedDueDate: string;
  frequencyDays: number;
  confidence: string;
  reason: string;
}

export interface GenerateCareScheduleRequest {
  horizonDays: number;
  plants: CareSchedulePlantContext[];
  fallbackSuggestions: CareScheduleSuggestionPayload[];
}

export interface GenerateCareScheduleResponse {
  suggestions: CareScheduleSuggestionPayload[];
  meta?: AiGenerationMeta;
}

import type {
  CurateArchiveGalleryRequest,
  GenerateCareScheduleRequest,
  GenerateDashboardInsightRequest,
  GenerateHealthInsightRequest,
  GenerateJournalSummaryRequest,
  GenerateStreakNudgeRequest,
  RefineCareLogRequest,
} from "../../../features/ai/types/ai.ts";

const HEALTH_SYSTEM = [
  "You are a cautious plant care editorial assistant.",
  "Never diagnose disease. Use observational language (may, appears, suggests).",
  "Return JSON: { \"title\": string, \"body\": string, \"confidence\": number 0-1, \"classification\": \"growth\"|\"dryness\"|\"stable\" }.",
].join(" ");

const DASHBOARD_SYSTEM = [
  "You write calm, concise dashboard editorial copy for a plant care app.",
  "Return JSON: { \"insight\": { \"title\": string, \"body\": string, \"plantId\": string|null } }.",
].join(" ");

const JOURNAL_SYSTEM = [
  "You write warm monthly journal summaries for a plant collection app.",
  "Return JSON: { \"summary\": { \"title\": string, \"body\": string } }.",
].join(" ");

const ARCHIVE_SYSTEM = [
  "You curate before/after photo pairs for a plant growth archive.",
  "Pick chronologically sensible pairs using photo timestamps when provided.",
  "Return JSON: { \"pairs\": [{ \"plantId\": string, \"plantName\": string, \"beforePhotoId\": string, \"afterPhotoId\": string, \"beforeUri\": string, \"afterUri\": string, \"caption\": string }] }.",
  "Maximum 3 pairs. Skip plants without two distinct photos.",
].join(" ");

const IDENTIFY_SYSTEM = [
  "You identify houseplant species from photos for a botanical collection app.",
  "If uncertain, return suggestion null.",
  "Return JSON: { \"suggestion\": { \"species\": string, \"confidence\": number 0-1, \"careProfileHint\": string, \"confidenceExplanation\": string } | null }.",
  "confidenceExplanation must describe visual evidence, not generic certainty.",
].join(" ");

const CARE_LOG_SYSTEM = [
  "You refine plant care journal notes without inventing facts.",
  "Return JSON: { \"suggestion\": { \"refinedNote\": string|null, \"suggestedTags\": string[] } }.",
  "suggestedTags must be from: new growth, yellowing leaves, dry soil, pest concern, pruning, stable condition.",
].join(" ");

const STREAK_SYSTEM = [
  "You write short streak recovery nudges for a plant care app.",
  "Return JSON: { \"nudge\": { \"body\": string } | null }.",
].join(" ");

const CARE_SCHEDULE_SYSTEM = [
  "You suggest optional care rhythms for a botanical collection app.",
  "Only propose care the plant likely needs beyond existing enabled reminders.",
  "Do not duplicate reminders already enabled for the same care type within a few days.",
  "Use calm, observational language. Never invent pests or diagnoses.",
  "Return JSON: { \"suggestions\": [{ \"plantId\": string, \"plantName\": string, \"careType\": \"water\"|\"mist\"|\"feed\"|\"repot\"|\"prune\"|\"inspect\", \"suggestedDueDate\": \"YYYY-MM-DD\", \"frequencyDays\": number, \"confidence\": \"low\"|\"medium\"|\"high\", \"reason\": string }] }.",
  "Maximum 8 suggestions. suggestedDueDate must fall within horizonDays from today context.",
].join(" ");

export function buildHealthInsightAiRequest(body: GenerateHealthInsightRequest) {
  return {
    system: HEALTH_SYSTEM,
    user: [
      `Species: ${body.speciesName}`,
      `Watering interval days: ${body.careSummary.wateringIntervalDays}`,
      `Days since last water: ${body.careSummary.daysSinceLastWater ?? "unknown"}`,
      `Overdue by days: ${body.careSummary.overdueByDays ?? 0}`,
      `Reminder count: ${body.careSummary.reminderCount}`,
      `Local classification: ${body.localAnalysis.classification}`,
      `Local confidence: ${body.localAnalysis.confidence}`,
      `Recent notes: ${body.recentLogNotes.join(" | ") || "none"}`,
      `Photo count in request: ${body.photoUris.length}`,
      "Improve the observation without increasing certainty beyond evidence.",
    ].join("\n"),
    images: undefined,
  };
}

export function buildDashboardAiRequest(body: GenerateDashboardInsightRequest) {
  return {
    system: DASHBOARD_SYSTEM,
    user: JSON.stringify(body.summary),
  };
}

export function buildJournalAiRequest(body: GenerateJournalSummaryRequest) {
  return {
    system: JOURNAL_SYSTEM,
    user: JSON.stringify({ monthKey: body.monthKey, summary: body.summary }),
  };
}

export function buildArchiveAiRequest(body: CurateArchiveGalleryRequest) {
  return {
    system: ARCHIVE_SYSTEM,
    user: JSON.stringify(body.items),
  };
}

export function buildIdentifyAiRequest(input: {
  speciesHint?: string;
  mimeType: string;
}) {
  return {
    system: IDENTIFY_SYSTEM,
    user: input.speciesHint
      ? `Optional filename hint: ${input.speciesHint}`
      : "Identify the plant species in this image.",
  };
}

export function buildCareLogAiRequest(body: RefineCareLogRequest) {
  return {
    system: CARE_LOG_SYSTEM,
    user: JSON.stringify({ note: body.note, logType: body.logType }),
  };
}

export function buildStreakAiRequest(body: GenerateStreakNudgeRequest) {
  return {
    system: STREAK_SYSTEM,
    user: JSON.stringify(body.summary),
  };
}

export function buildCareScheduleAiRequest(body: GenerateCareScheduleRequest) {
  return {
    system: CARE_SCHEDULE_SYSTEM,
    user: JSON.stringify({
      horizonDays: body.horizonDays,
      plants: body.plants,
      fallbackSuggestions: body.fallbackSuggestions,
    }),
  };
}

import type { GenerateHealthInsightRequest } from "../types/ai.ts";

export function buildHealthInsightPrompt(input: GenerateHealthInsightRequest) {
  return [
    "You are refining a cautious plant health observation for a calm editorial mobile app.",
    "Never diagnose, never imply certainty, and prefer suppression over overclaiming.",
    "Use short observational language with words like may, appears, or suggests.",
    `Species: ${input.speciesName}`,
    `Local classification: ${input.localAnalysis.classification}`,
    `Local confidence: ${input.localAnalysis.confidence}`,
    `Photo count: ${input.localAnalysis.signalSummary.photoHistoryCount}`,
    `Recent note summary: ${input.recentLogNotes.join(" | ") || "none"}`,
    `Fallback insight: ${input.fallback?.body ?? "none"}`,
  ].join("\n");
}

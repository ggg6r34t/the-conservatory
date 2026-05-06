import type { AiSource } from "@/features/ai/types/ai";

export type InsightSourceTone = "enhanced" | "local";

export function getInsightSourceLabel(source: AiSource): string {
  return source === "cloud" ? "Enhanced insight" : "Generated locally";
}

export function getInsightSourceTone(source: AiSource): InsightSourceTone {
  return source === "cloud" ? "enhanced" : "local";
}

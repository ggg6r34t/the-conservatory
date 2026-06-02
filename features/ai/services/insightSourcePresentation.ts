import type { AiSource } from "@/features/ai/types/ai";

export type InsightSourceTone = "enhanced" | "local";

export function getInsightSourceLabel(source: AiSource): string {
  return source === "cloud" ? "Enhanced insight" : "Generated locally";
}

export function getInsightSourceTone(source: AiSource): InsightSourceTone {
  return source === "cloud" ? "enhanced" : "local";
}

export function getInsightSourceDescription(source: AiSource): string {
  return source === "cloud"
    ? "Prepared with cloud assistance using your plant data."
    : "Prepared on this device from your care history.";
}

import type { HealthInsight } from "@/features/ai/types/ai";
import {
  HEALTH_INSIGHT_NEUTRAL_THRESHOLD,
  HEALTH_INSIGHT_SHOW_THRESHOLD,
  type HealthSignalAnalysis,
} from "@/features/ai/services/healthSignalAnalysisService";

const ABSOLUTE_LANGUAGE = [
  /\bdefinitely\b/i,
  /\bclearly\b/i,
  /\bcertainly\b/i,
  /\bimmediate(?:ly)?\b/i,
  /\burgent\b/i,
  /\brequired\b/i,
  /\broot rot\b/i,
  /\bfungal\b/i,
  /\binfestation\b/i,
  /\bsick\b/i,
  /\bdisease\b/i,
];

const HEDGED_LANGUAGE = /\bmay|appears?|suggests?|could indicate|no obvious change\b/i;

function normalizeTitle(title?: string | null) {
  return title?.trim() ? "Health insight" : "Health insight";
}

function normalizeBody(body: string) {
  return body
    .replace(/\bdefinitely\b/gi, "may")
    .replace(/\bclearly\b/gi, "suggests")
    .replace(/\bimmediate(?:ly)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsafe(body: string) {
  return ABSOLUTE_LANGUAGE.some((pattern) => pattern.test(body));
}

export function enforceHealthInsightSafety(input: {
  insight: Omit<HealthInsight, "source"> | null;
  analysis: HealthSignalAnalysis;
}) {
  if (!input.insight) {
    return null;
  }

  const normalizedBody = normalizeBody(input.insight.body);
  const confidence = Math.min(
    0.99,
    Math.max(0, input.insight.confidence ?? input.analysis.confidence),
  );

  if (isUnsafe(normalizedBody)) {
    return null;
  }

  if (!HEDGED_LANGUAGE.test(normalizedBody)) {
    return null;
  }

  if (input.analysis.classification === "unclear") {
    return null;
  }

  if (confidence < HEALTH_INSIGHT_NEUTRAL_THRESHOLD) {
    return null;
  }

  if (
    input.analysis.classification !== "stable" &&
    confidence < HEALTH_INSIGHT_SHOW_THRESHOLD
  ) {
    return null;
  }

  return {
    ...input.insight,
    title: normalizeTitle(input.insight.title),
    body: normalizedBody,
    confidence: Number(confidence.toFixed(2)),
  };
}

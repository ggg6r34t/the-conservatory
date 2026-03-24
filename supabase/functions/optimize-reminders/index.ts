import type {
  OptimizeRemindersRequest,
  OptimizeRemindersResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function alignToHour(value: Date, defaultHour: number) {
  const aligned = new Date(value);
  aligned.setHours(defaultHour, 0, 0, 0);
  return aligned;
}

function optimizeLocally(input: OptimizeRemindersRequest): OptimizeRemindersResponse {
  if (!input.reminderEnabled) {
    return {
      result: {
        nextDueAt: null,
        explanation: "Notifications are paused.",
        shouldSchedule: false,
      },
    };
  }

  const seed = input.nextDueAt ? new Date(input.nextDueAt) : new Date();
  const baseline = alignToHour(seed, input.defaultWateringHour);
  const fromWatering = input.lastWateredAt
    ? alignToHour(
        new Date(
          new Date(input.lastWateredAt).getTime() +
            input.wateringIntervalDays * DAY_MS,
        ),
        input.defaultWateringHour,
      )
    : baseline;
  const cooldownCutoff = input.lastTriggeredAt
    ? new Date(new Date(input.lastTriggeredAt).getTime() + 12 * HOUR_MS)
    : null;
  let optimized = fromWatering.getTime() > baseline.getTime() ? fromWatering : baseline;
  let explanation =
    fromWatering.getTime() > baseline.getTime()
      ? "Adjusted based on recent care."
      : null;

  if (cooldownCutoff && optimized.getTime() < cooldownCutoff.getTime()) {
    optimized = cooldownCutoff;
    explanation = "Held briefly to avoid repeated reminders.";
  }

  return {
    result: {
      nextDueAt: optimized.toISOString(),
      explanation,
      shouldSchedule: true,
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<OptimizeRemindersRequest>(request);
  if (!body?.plantName || !body?.speciesName) {
    return jsonResponse({ error: "plantName and speciesName are required." }, 400);
  }

  // Provider integration point:
  // remote optimization is optional; local-first logic stays authoritative in Phase 1.
  return jsonResponse(optimizeLocally(body));
});

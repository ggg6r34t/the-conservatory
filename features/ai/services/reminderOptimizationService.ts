import type {
  OptimizedReminderTiming,
  ReminderOptimizationInput,
} from "@/features/ai/types/ai";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function alignToHour(value: Date, defaultHour: number) {
  const aligned = new Date(value);
  aligned.setHours(defaultHour, 0, 0, 0);
  return aligned;
}

export function optimizeReminderTiming(
  input: ReminderOptimizationInput,
): OptimizedReminderTiming {
  if (!input.reminderEnabled) {
    return {
      nextDueAt: null,
      explanation: "Notifications are paused.",
      shouldSchedule: false,
    };
  }

  const now = new Date();
  const seedDate = input.nextDueAt
    ? new Date(input.nextDueAt)
    : input.lastWateredAt
      ? new Date(input.lastWateredAt)
      : now;

  const nextDueSeed = new Date(seedDate);
  if (!input.nextDueAt) {
    nextDueSeed.setDate(nextDueSeed.getDate() + input.wateringIntervalDays);
  }

  let optimizedDate = alignToHour(nextDueSeed, input.defaultWateringHour);
  let explanation: string | null = null;

  if (input.lastWateredAt) {
    const lastWateredAt = new Date(input.lastWateredAt);
    const idealDueAt = alignToHour(
      new Date(lastWateredAt.getTime() + input.wateringIntervalDays * DAY_MS),
      input.defaultWateringHour,
    );

    if (idealDueAt.getTime() > optimizedDate.getTime()) {
      optimizedDate = idealDueAt;
      explanation = "Adjusted based on recent care.";
    }
  }

  if (input.lastTriggeredAt) {
    const cooldownCutoff = new Date(
      new Date(input.lastTriggeredAt).getTime() + 12 * HOUR_MS,
    );
    if (optimizedDate.getTime() < cooldownCutoff.getTime()) {
      optimizedDate = cooldownCutoff;
      explanation = "Held briefly to avoid repeated reminders.";
    }
  }

  if (optimizedDate.getTime() <= now.getTime()) {
    optimizedDate = alignToHour(
      new Date(now.getTime() + (now.getHours() >= input.defaultWateringHour ? DAY_MS : 0)),
      input.defaultWateringHour,
    );
    explanation = explanation ?? "Moved to the next calm reminder window.";
  }

  return {
    nextDueAt: optimizedDate.toISOString(),
    explanation,
    shouldSchedule: true,
  };
}

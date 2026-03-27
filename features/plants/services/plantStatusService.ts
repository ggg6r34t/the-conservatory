import type { CareLog, CareReminder } from "@/types/models";

import type { PlantListItem } from "../api/plantsClient";

export type PlantHealthState = "thriving" | "stable" | "needs_attention";
export type EffectiveNextWateringSource =
  | "reminder"
  | "plant"
  | "derived"
  | "none";

export interface PlantStatus {
  effectiveNextWateringDate: string | null;
  effectiveNextWateringSource: EffectiveNextWateringSource;
  isDue: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
  isRecentlyWatered: boolean;
  healthState: PlantHealthState;
  latestActivityAt: string;
  lastWateredAt: string | null;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function latestIso(values: Array<string | null | undefined>) {
  const latest = values
    .map((value) => ({ value, timestamp: toTimestamp(value) }))
    .filter(
      (entry): entry is { value: string; timestamp: number } =>
        entry.value != null && entry.timestamp != null,
    )
    .sort((left, right) => right.timestamp - left.timestamp)[0];

  return latest?.value ?? null;
}

function getPrimaryWaterReminder(reminders: CareReminder[]) {
  return reminders
    .filter((reminder) => reminder.reminderType === "water" && Boolean(reminder.enabled))
    .sort((left, right) => {
      const leftDue = toTimestamp(left.nextDueAt) ?? Number.POSITIVE_INFINITY;
      const rightDue = toTimestamp(right.nextDueAt) ?? Number.POSITIVE_INFINITY;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return (
        (toTimestamp(right.updatedAt) ?? 0) - (toTimestamp(left.updatedAt) ?? 0)
      );
    })[0];
}

function getLatestWaterLog(logs: CareLog[]) {
  return logs
    .filter((log) => log.logType === "water")
    .sort(
      (left, right) =>
        (toTimestamp(right.loggedAt) ?? 0) - (toTimestamp(left.loggedAt) ?? 0),
    )[0];
}

function calculateDaysUntilDue(targetIso: string, now: Date) {
  const start = startOfDay(now).getTime();
  const target = startOfDay(new Date(targetIso)).getTime();

  return Math.round((target - start) / (1000 * 60 * 60 * 24));
}

function resolveEffectiveNextWateringDate(input: {
  reminder: CareReminder | undefined;
  plant: PlantListItem;
  lastWateredAt: string | null;
}): {
  effectiveNextWateringDate: string | null;
  effectiveNextWateringSource: EffectiveNextWateringSource;
} {
  const hasValidInterval = input.plant.wateringIntervalDays > 0;
  const derivedDate =
    input.lastWateredAt != null && hasValidInterval
      ? addDays(input.lastWateredAt, input.plant.wateringIntervalDays)
      : null;

  const candidates = [
    {
      value: input.reminder?.nextDueAt ?? null,
      source: "reminder" as const,
      updatedAt: input.reminder?.updatedAt ?? null,
    },
    {
      value: input.plant.nextWaterDueAt ?? null,
      source: "plant" as const,
      updatedAt: input.plant.updatedAt,
    },
    {
      value: derivedDate,
      source: "derived" as const,
      updatedAt: input.lastWateredAt,
    },
  ].filter(
    (candidate): candidate is {
      value: string;
      source: Exclude<EffectiveNextWateringSource, "none">;
      updatedAt: string | null;
    } => candidate.value != null,
  );

  if (candidates.length === 0) {
    return {
      effectiveNextWateringDate: null,
      effectiveNextWateringSource: "none",
    };
  }

  const selected = [...candidates].sort((left, right) => {
    const leftUpdatedAt = toTimestamp(left.updatedAt) ?? 0;
    const rightUpdatedAt = toTimestamp(right.updatedAt) ?? 0;

    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    const leftValue = toTimestamp(left.value) ?? Number.POSITIVE_INFINITY;
    const rightValue = toTimestamp(right.value) ?? Number.POSITIVE_INFINITY;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }

    return left.source.localeCompare(right.source);
  })[0];

  return {
    effectiveNextWateringDate: selected.value,
    effectiveNextWateringSource: selected.source,
  };
}

export function derivePlantStatus(input: {
  plant: PlantListItem;
  reminders: CareReminder[];
  logs: CareLog[];
  now?: Date;
}): PlantStatus {
  const now = input.now ?? new Date();
  const activeReminder = getPrimaryWaterReminder(input.reminders);
  const latestWaterLog = getLatestWaterLog(input.logs);
  const resolvedLastWateredAt = latestIso([
    input.plant.lastWateredAt ?? null,
    latestWaterLog?.loggedAt ?? null,
  ]);
  const { effectiveNextWateringDate, effectiveNextWateringSource } =
    resolveEffectiveNextWateringDate({
      reminder: activeReminder,
      plant: input.plant,
      lastWateredAt: resolvedLastWateredAt,
    });

  const dueTimestamp = toTimestamp(effectiveNextWateringDate);
  const startToday = startOfDay(now).getTime();
  const endToday = endOfDay(now).getTime();
  const isOverdue = dueTimestamp != null ? dueTimestamp < startToday : false;
  const isDue = dueTimestamp != null ? dueTimestamp >= startToday && dueTimestamp <= endToday : false;
  const daysUntilDue =
    effectiveNextWateringDate != null
      ? calculateDaysUntilDue(effectiveNextWateringDate, now)
      : null;

  const recentThresholdDays = Math.min(
    3,
    Math.max(1, Math.floor(input.plant.wateringIntervalDays / 3)),
  );
  const recentlyWateredCutoff = new Date(now);
  recentlyWateredCutoff.setDate(recentlyWateredCutoff.getDate() - recentThresholdDays);
  const isRecentlyWatered =
    (toTimestamp(resolvedLastWateredAt) ?? 0) >= recentlyWateredCutoff.getTime();

  let healthState: PlantHealthState = "stable";
  if (isDue || isOverdue) {
    healthState = "needs_attention";
  } else if (
    effectiveNextWateringDate != null &&
    isRecentlyWatered &&
    daysUntilDue != null &&
    daysUntilDue > 2
  ) {
    healthState = "thriving";
  }

  return {
    effectiveNextWateringDate,
    effectiveNextWateringSource,
    isDue,
    isOverdue,
    daysUntilDue,
    isRecentlyWatered,
    healthState,
    latestActivityAt:
      latestIso([
        input.plant.updatedAt,
        resolvedLastWateredAt,
        latestWaterLog?.updatedAt ?? null,
        activeReminder?.updatedAt ?? null,
      ]) ?? input.plant.updatedAt,
    lastWateredAt: resolvedLastWateredAt,
  };
}

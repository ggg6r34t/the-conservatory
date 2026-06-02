import type { CareLogType } from "@/types/models";

export function resolveStreakTimeZone(preferredTimezone?: string | null) {
  if (preferredTimezone && preferredTimezone.trim().length > 0) {
    return preferredTimezone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export type StreakAnalyticsPayload = {
  currentStreak: number;
  longestStreak: number;
  previousStreak: number;
  logType?: CareLogType;
  plantCount: number;
  timeZone: string;
};

export type StreakAnalyticsEvent =
  | "streak_started"
  | "streak_extended"
  | "streak_maintained"
  | "streak_broken"
  | "streak_recovered";

export function classifyCareLogStreakEvent(input: {
  beforeCurrent: number;
  afterCurrent: number;
  beforeLongest: number;
}): StreakAnalyticsEvent | null {
  if (input.afterCurrent > input.beforeCurrent) {
    if (input.beforeCurrent === 0) {
      return input.beforeLongest > 0 ? "streak_recovered" : "streak_started";
    }

    return "streak_extended";
  }

  if (
    input.afterCurrent === input.beforeCurrent &&
    input.afterCurrent > 0
  ) {
    return "streak_maintained";
  }

  return null;
}

export function shouldTrackStreakBroken(input: {
  previousCurrent: number | null;
  currentStreak: number;
  isLoading: boolean;
}) {
  if (input.isLoading || input.previousCurrent === null) {
    return false;
  }

  return input.previousCurrent > 0 && input.currentStreak === 0;
}

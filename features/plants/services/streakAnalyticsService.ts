import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";
import {
  computeCollectionStreak,
  isQualifyingStreakLogType,
  type CollectionStreakStats,
} from "@/features/plants/services/collectionStreakService";
import {
  classifyCareLogStreakEvent,
  shouldTrackStreakBroken,
  type StreakAnalyticsPayload,
} from "@/features/plants/services/streakAnalyticsHelpers";
import { trackStreakEvent } from "@/services/analytics/analyticsService";
import type { CareLog } from "@/types/models";

function buildPayload(input: {
  before: CollectionStreakStats;
  after: CollectionStreakStats;
  plantCount: number;
  timeZone: string;
  logType?: CareLog["logType"];
}): StreakAnalyticsPayload {
  return {
    currentStreak: input.after.currentStreak,
    longestStreak: input.after.longestStreak,
    previousStreak: input.before.currentStreak,
    logType: input.logType,
    plantCount: input.plantCount,
    timeZone: input.timeZone,
  };
}

export async function trackStreakChangeAfterCareLog(input: {
  userId: string;
  plantIds: string[];
  timeZone: string;
  newLog: CareLog;
}) {
  if (!isQualifyingStreakLogType(input.newLog.logType)) {
    return;
  }

  const logs = await listCareLogsForPlants(input.plantIds);
  const evaluationInstant = new Date(input.newLog.loggedAt);
  const beforeLogs = logs.filter((log) => log.id !== input.newLog.id);
  const before = computeCollectionStreak(beforeLogs, {
    timeZone: input.timeZone,
    now: evaluationInstant,
  });
  const after = computeCollectionStreak(logs, {
    timeZone: input.timeZone,
    now: evaluationInstant,
  });

  const event = classifyCareLogStreakEvent({
    beforeCurrent: before.currentStreak,
    afterCurrent: after.currentStreak,
    beforeLongest: before.longestStreak,
  });

  if (!event) {
    return;
  }

  trackStreakEvent(
    event,
    buildPayload({
      before,
      after,
      plantCount: input.plantIds.length,
      timeZone: input.timeZone,
      logType: input.newLog.logType,
    }),
  );
}

export function trackStreakBrokenOnSession(input: {
  previousCurrent: number | null;
  stats: CollectionStreakStats;
  plantCount: number;
  timeZone: string;
  isLoading: boolean;
}) {
  if (
    !shouldTrackStreakBroken({
      previousCurrent: input.previousCurrent,
      currentStreak: input.stats.currentStreak,
      isLoading: input.isLoading,
    })
  ) {
    return;
  }

  trackStreakEvent("streak_broken", {
    currentStreak: input.stats.currentStreak,
    longestStreak: input.stats.longestStreak,
    previousStreak: input.previousCurrent ?? 0,
    plantCount: input.plantCount,
    timeZone: input.timeZone,
  });
}

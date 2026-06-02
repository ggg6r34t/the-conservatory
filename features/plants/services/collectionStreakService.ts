import type { CareLog, CareLogType } from "@/types/models";

/** Care actions that count toward the collection-wide daily streak. */
export const QUALIFYING_STREAK_LOG_TYPES: CareLogType[] = [
  "water",
  "feed",
  "mist",
  "prune",
  "inspect",
  "repot",
  "pest",
];

export type CollectionStreakStats = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDayKey: string | null;
  streakStartDayKey: string | null;
};

export function isQualifyingStreakLogType(logType: CareLogType) {
  return QUALIFYING_STREAK_LOG_TYPES.includes(logType);
}

export function toLocalDayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function toLocalDayKeyFromDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localDayKeyToAnchorMs(dayKey: string, timeZone: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  let candidate = Date.UTC(year, month - 1, day, 12, 0, 0);

  for (let offset = -18; offset <= 18; offset += 1) {
    const probe = candidate + offset * 60 * 60 * 1000;
    if (toLocalDayKeyFromDate(new Date(probe), timeZone) === dayKey) {
      return probe;
    }
  }

  return candidate;
}

export function previousLocalDayKey(dayKey: string, timeZone: string) {
  let probe = localDayKeyToAnchorMs(dayKey, timeZone) - 12 * 60 * 60 * 1000;

  while (toLocalDayKeyFromDate(new Date(probe), timeZone) === dayKey) {
    probe -= 60 * 60 * 1000;
  }

  return toLocalDayKeyFromDate(new Date(probe), timeZone);
}

export function nextLocalDayKey(dayKey: string, timeZone: string) {
  let probe = localDayKeyToAnchorMs(dayKey, timeZone) + 12 * 60 * 60 * 1000;

  while (toLocalDayKeyFromDate(new Date(probe), timeZone) === dayKey) {
    probe += 60 * 60 * 1000;
  }

  return toLocalDayKeyFromDate(new Date(probe), timeZone);
}

function uniqueQualifyingDayKeys(
  logs: Pick<CareLog, "loggedAt" | "logType">[],
  timeZone: string,
) {
  return Array.from(
    new Set(
      logs
        .filter((log) => isQualifyingStreakLogType(log.logType))
        .map((log) => toLocalDayKey(log.loggedAt, timeZone)),
    ),
  ).sort((left, right) => right.localeCompare(left));
}

function computeLongestStreak(dayKeysDescending: string[], timeZone: string) {
  if (!dayKeysDescending.length) {
    return 0;
  }

  const ascending = [...dayKeysDescending].reverse();
  let best = 1;
  let run = 1;

  for (let index = 1; index < ascending.length; index += 1) {
    const expectedNext = nextLocalDayKey(ascending[index - 1], timeZone);
    if (ascending[index] === expectedNext) {
      run += 1;
      best = Math.max(best, run);
      continue;
    }

    run = 1;
  }

  return best;
}

export function computeCollectionStreak(
  logs: Pick<CareLog, "loggedAt" | "logType">[],
  options: { timeZone: string; now?: Date },
): CollectionStreakStats {
  const timeZone = options.timeZone;
  const now = options.now ?? new Date();
  const todayKey = toLocalDayKeyFromDate(now, timeZone);
  const yesterdayKey = previousLocalDayKey(todayKey, timeZone);
  const dayKeys = uniqueQualifyingDayKeys(logs, timeZone);
  const longestStreak = computeLongestStreak(dayKeys, timeZone);

  if (!dayKeys.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDayKey: null,
      streakStartDayKey: null,
    };
  }

  const mostRecent = dayKeys[0];

  if (mostRecent !== todayKey && mostRecent !== yesterdayKey) {
    return {
      currentStreak: 0,
      longestStreak,
      lastActivityDayKey: mostRecent,
      streakStartDayKey: null,
    };
  }

  let currentStreak = 1;
  let streakStartDayKey = mostRecent;
  let cursor = mostRecent;

  for (let index = 1; index < dayKeys.length; index += 1) {
    const expectedPrevious = previousLocalDayKey(cursor, timeZone);
    if (dayKeys[index] === expectedPrevious) {
      currentStreak += 1;
      cursor = dayKeys[index];
      streakStartDayKey = cursor;
      continue;
    }

    if (dayKeys[index] < expectedPrevious) {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDayKey: mostRecent,
    streakStartDayKey,
  };
}

export function resolveDisplayStreak(
  computedStreak: number,
  lastStableStreak: number,
  careLogsData: unknown[] | undefined,
) {
  if (careLogsData !== undefined) {
    return computedStreak;
  }

  return lastStableStreak;
}

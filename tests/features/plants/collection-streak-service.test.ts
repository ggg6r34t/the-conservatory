import {
  computeCollectionStreak,
  isQualifyingStreakLogType,
  nextLocalDayKey,
  previousLocalDayKey,
  toLocalDayKey,
  toLocalDayKeyFromDate,
} from "@/features/plants/services/collectionStreakService";
import type { CareLog, CareLogType } from "@/types/models";

const TIME_ZONE = "UTC";

function buildLog(loggedAt: string, logType: CareLogType = "water"): CareLog {
  return {
    id: `${loggedAt}-${logType}`,
    userId: "user-1",
    plantId: "plant-1",
    logType,
    loggedAt,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    pending: 0,
  };
}

function isoForDayKey(dayKey: string, hourUtc = 12) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hourUtc, 0, 0)).toISOString();
}

describe("collectionStreakService", () => {
  it("starts a streak on the first qualifying care day", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const stats = computeCollectionStreak(
      [buildLog(isoForDayKey(today))],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.lastActivityDayKey).toBe(today);
    expect(stats.streakStartDayKey).toBe(today);
  });

  it("continues a streak across consecutive qualifying days", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const yesterday = previousLocalDayKey(today, TIME_ZONE);

    const stats = computeCollectionStreak(
      [buildLog(isoForDayKey(today)), buildLog(isoForDayKey(yesterday))],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
  });

  it("does not increment twice for multiple qualifying actions on the same day", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);

    const stats = computeCollectionStreak(
      [
        buildLog(isoForDayKey(today, 9), "water"),
        buildLog(isoForDayKey(today, 18), "feed"),
        buildLog(isoForDayKey(today, 21), "mist"),
      ],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(1);
  });

  it("breaks the streak after a missed day", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const threeDaysAgo = previousLocalDayKey(
      previousLocalDayKey(previousLocalDayKey(today, TIME_ZONE), TIME_ZONE),
      TIME_ZONE,
    );

    const stats = computeCollectionStreak(
      [buildLog(isoForDayKey(threeDaysAgo))],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(1);
  });

  it("allows yesterday-only activity until the day ends", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const yesterday = previousLocalDayKey(today, TIME_ZONE);

    const stats = computeCollectionStreak(
      [buildLog(isoForDayKey(yesterday))],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(1);
  });

  it("ignores non-qualifying note logs", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);

    const stats = computeCollectionStreak(
      [buildLog(isoForDayKey(today), "note")],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(0);
  });

  it("tracks longest streak separately from the current streak", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const yesterday = previousLocalDayKey(today, TIME_ZONE);
    const fiveDaysAgo = previousLocalDayKey(
      previousLocalDayKey(
        previousLocalDayKey(
          previousLocalDayKey(previousLocalDayKey(today, TIME_ZONE), TIME_ZONE),
          TIME_ZONE,
        ),
        TIME_ZONE,
      ),
      TIME_ZONE,
    );
    const fourDaysAgo = nextLocalDayKey(fiveDaysAgo, TIME_ZONE);
    const threeDaysAgo = nextLocalDayKey(fourDaysAgo, TIME_ZONE);

    const stats = computeCollectionStreak(
      [
        buildLog(isoForDayKey(yesterday)),
        buildLog(isoForDayKey(threeDaysAgo)),
        buildLog(isoForDayKey(fourDaysAgo)),
        buildLog(isoForDayKey(fiveDaysAgo)),
      ],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(3);
  });

  it("respects timezone boundaries for late-night logs", () => {
    const dayKey = "2026-06-02";
    const lateNight = "2026-06-02T23:30:00-04:00";

    expect(toLocalDayKey(lateNight, "America/New_York")).toBe(dayKey);

    const stats = computeCollectionStreak([buildLog(lateNight)], {
      timeZone: "America/New_York",
      now: new Date("2026-06-02T15:00:00-04:00"),
    });

    expect(stats.currentStreak).toBe(1);
  });

  it("handles backdated logs without double-counting days", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const yesterday = previousLocalDayKey(today, TIME_ZONE);

    const stats = computeCollectionStreak(
      [
        buildLog(isoForDayKey(today)),
        buildLog(isoForDayKey(yesterday)),
        buildLog(isoForDayKey(yesterday, 8)),
      ],
      { timeZone: TIME_ZONE },
    );

    expect(stats.currentStreak).toBe(2);
  });

  it("does not count future-dated logs toward today's streak", () => {
    const today = toLocalDayKeyFromDate(new Date(), TIME_ZONE);
    const tomorrow = nextLocalDayKey(today, TIME_ZONE);

    const stats = computeCollectionStreak([buildLog(isoForDayKey(tomorrow))], {
      timeZone: TIME_ZONE,
    });

    expect(stats.currentStreak).toBe(0);
  });

  it("identifies qualifying log types", () => {
    expect(isQualifyingStreakLogType("water")).toBe(true);
    expect(isQualifyingStreakLogType("note")).toBe(false);
  });
});

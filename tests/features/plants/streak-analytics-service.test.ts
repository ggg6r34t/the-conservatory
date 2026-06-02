jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  listCareLogsForPlants: jest.fn(),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackStreakEvent: jest.fn(),
}));

import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";
import {
  trackStreakBrokenOnSession,
  trackStreakChangeAfterCareLog,
} from "@/features/plants/services/streakAnalyticsService";
import { trackStreakEvent } from "@/services/analytics/analyticsService";
import type { CareLog } from "@/types/models";

const mockListCareLogsForPlants = listCareLogsForPlants as jest.MockedFunction<
  typeof listCareLogsForPlants
>;
const mockTrackStreakEvent = trackStreakEvent as jest.MockedFunction<
  typeof trackStreakEvent
>;

function buildLog(
  id: string,
  loggedAt: string,
  logType: CareLog["logType"] = "water",
): CareLog {
  return {
    id,
    userId: "user-1",
    plantId: "plant-1",
    logType,
    loggedAt,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    pending: 0,
  };
}

describe("streakAnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits streak_started after the first qualifying care log", async () => {
    const newLog = buildLog("log-1", "2026-06-02T12:00:00.000Z");
    mockListCareLogsForPlants.mockResolvedValue([newLog]);

    await trackStreakChangeAfterCareLog({
      userId: "user-1",
      plantIds: ["plant-1"],
      timeZone: "UTC",
      newLog,
    });

    expect(mockTrackStreakEvent).toHaveBeenCalledWith(
      "streak_started",
      expect.objectContaining({
        currentStreak: 1,
        previousStreak: 0,
      }),
    );
  });

  it("emits streak_recovered when restarting after a prior best run", async () => {
    const priorLogs = [
      buildLog("log-1", "2026-05-30T12:00:00.000Z"),
      buildLog("log-2", "2026-05-29T12:00:00.000Z"),
      buildLog("log-3", "2026-05-28T12:00:00.000Z"),
    ];
    const newLog = buildLog("log-4", "2026-06-02T12:00:00.000Z");
    mockListCareLogsForPlants.mockResolvedValue([...priorLogs, newLog]);

    await trackStreakChangeAfterCareLog({
      userId: "user-1",
      plantIds: ["plant-1"],
      timeZone: "UTC",
      newLog,
    });

    expect(mockTrackStreakEvent).toHaveBeenCalledWith(
      "streak_recovered",
      expect.objectContaining({
        currentStreak: 1,
        longestStreak: 3,
        previousStreak: 0,
      }),
    );
  });

  it("ignores non-qualifying note logs", async () => {
    const newLog = buildLog("log-1", "2026-06-02T12:00:00.000Z", "note");
    mockListCareLogsForPlants.mockResolvedValue([newLog]);

    await trackStreakChangeAfterCareLog({
      userId: "user-1",
      plantIds: ["plant-1"],
      timeZone: "UTC",
      newLog,
    });

    expect(mockTrackStreakEvent).not.toHaveBeenCalled();
  });

  it("emits streak_broken when a session observes a drop to zero", () => {
    trackStreakBrokenOnSession({
      previousCurrent: 4,
      stats: {
        currentStreak: 0,
        longestStreak: 4,
        lastActivityDayKey: "2026-05-30",
        streakStartDayKey: null,
      },
      plantCount: 2,
      timeZone: "UTC",
      isLoading: false,
    });

    expect(mockTrackStreakEvent).toHaveBeenCalledWith(
      "streak_broken",
      expect.objectContaining({
        currentStreak: 0,
        previousStreak: 4,
      }),
    );
  });
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  buildLocalStreakNudge,
  calculateCurrentStreakDays,
} from "@/features/ai/services/streakNudgeService";
import type { CareLog, Plant } from "@/types/models";

function createPlant(overrides?: Partial<Plant>): Plant {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Ficus",
    speciesName: "Ficus lyrata",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(loggedAt: string): CareLog {
  return {
    id: loggedAt,
    userId: "user-1",
    plantId: "plant-1",
    logType: "water",
    loggedAt,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    pending: 0,
  };
}

describe("streakNudgeService", () => {
  it("calculates a current streak from recent daily activity", () => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const result = calculateCurrentStreakDays([
      createLog(today.toISOString()),
      createLog(yesterday.toISOString()),
    ]);

    expect(result).toBeGreaterThanOrEqual(2);
  });

  it("returns a gentle nudge when care is overdue and logs have gone quiet", () => {
    const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oldLogDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const result = buildLocalStreakNudge({
      currentStreakDays: 2,
      plants: [createPlant({ nextWaterDueAt: overdueDate })],
      logs: [createLog(oldLogDate)],
    });

    expect(result?.body).toContain("rhythm steady");
  });

  it("suppresses nudges when activity is already current", () => {
    const recentLogDate = new Date().toISOString();

    const result = buildLocalStreakNudge({
      currentStreakDays: 1,
      plants: [createPlant()],
      logs: [createLog(recentLogDate)],
    });

    expect(result).toBeNull();
  });
});

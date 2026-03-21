import { calculatePlantStreak } from "@/features/plants/services/streakService";
import type { CareLog } from "@/types/models";

const buildLog = (loggedAt: string): CareLog => ({
  id: loggedAt,
  userId: "user-1",
  plantId: "plant-1",
  logType: "water",
  notes: null,
  loggedAt,
  createdAt: loggedAt,
  updatedAt: loggedAt,
  updatedBy: "user-1",
  pending: 0,
  syncedAt: loggedAt,
  syncError: null,
});

describe("calculatePlantStreak", () => {
  it("should count consecutive on-interval water logs", () => {
    const streak = calculatePlantStreak(
      [
        buildLog("2026-03-20T10:00:00.000Z"),
        buildLog("2026-03-13T10:00:00.000Z"),
        buildLog("2026-03-06T10:00:00.000Z"),
      ],
      7,
    );

    expect(streak).toBe(3);
  });

  it("should stop when a watering gap breaks the cadence", () => {
    const streak = calculatePlantStreak(
      [
        buildLog("2026-03-20T10:00:00.000Z"),
        buildLog("2026-02-28T10:00:00.000Z"),
        buildLog("2026-02-20T10:00:00.000Z"),
      ],
      7,
    );

    expect(streak).toBe(1);
  });
});

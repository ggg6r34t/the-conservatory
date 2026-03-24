jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { buildLocalInsight } from "@/features/ai/services/dashboardInsightService";
import { buildLocalMonthlySummary } from "@/features/ai/services/journalSummaryService";
import {
  buildLocalStreakNudge,
} from "@/features/ai/services/streakNudgeService";
import { containsPressureLanguage } from "@/features/ai/services/editorialVoiceService";
import type { CareLog, Plant } from "@/types/models";

function createPlant(overrides?: Partial<Plant>): Plant {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(overrides?: Partial<CareLog>): CareLog {
  return {
    id: "log-1",
    userId: "user-1",
    plantId: "plant-1",
    logType: "water",
    loggedAt: "2026-03-20T10:00:00.000Z",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

describe("editorial AI fallback copy", () => {
  it("keeps dashboard fallback copy deterministic for the same state", () => {
    const input = {
      plants: [createPlant({ nextWaterDueAt: "2026-03-24T09:00:00.000Z" })],
      reminders: [],
      currentStreakDays: 0,
    };

    expect(buildLocalInsight(input)).toEqual(buildLocalInsight(input));
  });

  it("keeps journal fallback copy deterministic for the same state", () => {
    const plantsById = new Map([["plant-1", createPlant()]]);
    const input = {
      monthKey: "2026-03",
      logs: [createLog(), createLog({ id: "log-2", loggedAt: "2026-03-18T10:00:00.000Z" })],
      photoCount: 2,
      plantsById,
    };

    expect(buildLocalMonthlySummary(input)).toEqual(buildLocalMonthlySummary(input));
  });

  it("keeps streak fallback copy free of pressure language", () => {
    const nudge = buildLocalStreakNudge({
      currentStreakDays: 0,
      plants: [createPlant({ nextWaterDueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })],
      logs: [createLog({ loggedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() })],
    });

    expect(nudge).not.toBeNull();
    expect(containsPressureLanguage(nudge!.body)).toBe(false);
  });
});

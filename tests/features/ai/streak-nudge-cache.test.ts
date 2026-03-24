jest.mock("@/features/ai/api/aiClient", () => ({
  requestStreakNudge: jest.fn(async ({ fallback }) => ({ nudge: fallback })),
}));

jest.mock("@/features/ai/services/aiCache", () => {
  const store = new Map<string, unknown>();
  return {
    getCachedValue: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    setCachedValue: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
});

import { requestStreakNudge } from "@/features/ai/api/aiClient";
import {
  buildStreakNudgeStateSignature,
  getStreakRecoveryNudge,
} from "@/features/ai/services/streakNudgeService";
import type { CareLog, Plant } from "@/types/models";

function createPlant(overrides?: Partial<Plant>): Plant {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    nextWaterDueAt: "2026-03-24T09:00:00.000Z",
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

describe("streakNudgeService cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("changes the streak signature when recent care activity changes", () => {
    const first = buildStreakNudgeStateSignature({
      plants: [createPlant()],
      logs: [createLog("2026-03-21T09:00:00.000Z")],
    });
    const second = buildStreakNudgeStateSignature({
      plants: [createPlant({ lastWateredAt: "2026-03-24T08:00:00.000Z", updatedAt: "2026-03-24T08:00:00.000Z" })],
      logs: [createLog("2026-03-24T08:00:00.000Z")],
    });

    expect(first).not.toBe(second);
  });

  it("does not reuse a stale same-day nudge after fresh care activity", async () => {
    const now = new Date("2026-03-24T10:00:00.000Z");

    await getStreakRecoveryNudge({
      userId: "user-1",
      plants: [createPlant()],
      logs: [createLog("2026-03-21T09:00:00.000Z")],
      now,
    });

    await getStreakRecoveryNudge({
      userId: "user-1",
      plants: [createPlant({ lastWateredAt: "2026-03-24T08:00:00.000Z", updatedAt: "2026-03-24T08:00:00.000Z" })],
      logs: [createLog("2026-03-24T08:00:00.000Z")],
      now,
    });

    expect(requestStreakNudge).toHaveBeenCalledTimes(1);
  });
});

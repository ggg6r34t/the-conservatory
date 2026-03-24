jest.mock("@/features/ai/api/aiClient", () => ({
  requestDashboardInsight: jest.fn(async ({ fallback }) => ({ insight: fallback })),
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

import { requestDashboardInsight } from "@/features/ai/api/aiClient";
import {
  buildDashboardStateSignature,
  getDashboardInsight,
} from "@/features/ai/services/dashboardInsightService";
import type { CareReminder, Plant } from "@/types/models";

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

describe("dashboardInsightService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("changes the dashboard signature when meaningful plant state changes", () => {
    const first = buildDashboardStateSignature({
      plants: [createPlant({ nextWaterDueAt: "2026-03-24T09:00:00.000Z" })],
      reminders: [],
      currentStreakDays: 0,
    });
    const second = buildDashboardStateSignature({
      plants: [createPlant({ nextWaterDueAt: "2026-03-24T09:00:00.000Z", lastWateredAt: "2026-03-24T08:00:00.000Z", updatedAt: "2026-03-24T08:00:00.000Z" })],
      reminders: [],
      currentStreakDays: 0,
    });

    expect(first).not.toBe(second);
  });

  it("does not reuse the same-day cache after meaningful care state changes", async () => {
    const now = new Date("2026-03-24T10:00:00.000Z");
    const reminder: CareReminder = {
      id: "reminder-1",
      userId: "user-1",
      plantId: "plant-1",
      reminderType: "water",
      frequencyDays: 7,
      enabled: 1,
      nextDueAt: "2026-03-24T09:00:00.000Z",
      createdAt: "2026-03-20T10:00:00.000Z",
      updatedAt: "2026-03-20T10:00:00.000Z",
      pending: 0,
    };

    await getDashboardInsight({
      userId: "user-1",
      plants: [createPlant({ nextWaterDueAt: "2026-03-24T09:00:00.000Z" })],
      reminders: [reminder],
      currentStreakDays: 0,
      now,
    });

    await getDashboardInsight({
      userId: "user-1",
      plants: [
        createPlant({
          nextWaterDueAt: "2026-03-31T09:00:00.000Z",
          lastWateredAt: "2026-03-24T08:00:00.000Z",
          updatedAt: "2026-03-24T08:00:00.000Z",
        }),
      ],
      reminders: [
        {
          ...reminder,
          nextDueAt: "2026-03-31T09:00:00.000Z",
          updatedAt: "2026-03-24T08:00:00.000Z",
        },
      ],
      currentStreakDays: 0,
      now,
    });

    expect(requestDashboardInsight).toHaveBeenCalledTimes(2);
  });
});

import { derivePlantStatus } from "@/features/plants/services/plantStatusService";
import type { CareLog, CareReminder, Plant } from "@/types/models";

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

function createReminder(overrides?: Partial<CareReminder>): CareReminder {
  return {
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
    ...overrides,
  };
}

function createLog(overrides?: Partial<CareLog>): CareLog {
  return {
    id: "log-1",
    userId: "user-1",
    plantId: "plant-1",
    logType: "water",
    loggedAt: "2026-03-20T08:00:00.000Z",
    createdAt: "2026-03-20T08:00:00.000Z",
    updatedAt: "2026-03-20T08:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

describe("plantStatusService", () => {
  const now = new Date("2026-03-24T10:00:00.000Z");

  it("marks plants due today as needing attention", () => {
    const status = derivePlantStatus({
      plant: createPlant(),
      reminders: [createReminder()],
      logs: [],
      now,
    });

    expect(status.isDue).toBe(true);
    expect(status.isOverdue).toBe(false);
    expect(status.healthState).toBe("needs_attention");
  });

  it("marks overdue plants as needing attention", () => {
    const status = derivePlantStatus({
      plant: createPlant(),
      reminders: [
        createReminder({ nextDueAt: "2026-03-23T09:00:00.000Z" }),
      ],
      logs: [],
      now,
    });

    expect(status.isOverdue).toBe(true);
    expect(status.healthState).toBe("needs_attention");
  });

  it("resolves a single effective next watering date from the freshest source", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        nextWaterDueAt: "2026-03-29T09:00:00.000Z",
        updatedAt: "2026-03-19T10:00:00.000Z",
      }),
      reminders: [
        createReminder({
          nextDueAt: "2026-03-27T09:00:00.000Z",
          updatedAt: "2026-03-18T10:00:00.000Z",
        }),
      ],
      logs: [createLog({ loggedAt: "2026-03-21T08:00:00.000Z" })],
      now,
    });

    expect(status.effectiveNextWateringDate).toBe("2026-03-28T08:00:00.000Z");
    expect(status.effectiveNextWateringSource).toBe("derived");
  });

  it("marks recently watered plants with enough breathing room as thriving", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        lastWateredAt: "2026-03-23T08:00:00.000Z",
      }),
      reminders: [
        createReminder({ nextDueAt: "2026-03-29T09:00:00.000Z" }),
      ],
      logs: [createLog({ loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(status.isRecentlyWatered).toBe(true);
    expect(status.daysSinceWatered).toBe(1);
    expect(status.recentWateredWindowDays).toBe(2);
    expect(status.thrivingBufferDays).toBe(2);
    expect(status.healthState).toBe("thriving");
  });

  it("keeps 7-day interval plants stable when the next due date is too close", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        lastWateredAt: "2026-03-23T08:00:00.000Z",
      }),
      reminders: [
        createReminder({
          nextDueAt: "2026-03-25T09:00:00.000Z",
          updatedAt: "2026-03-24T09:00:00.000Z",
        }),
      ],
      logs: [createLog({ loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(status.isRecentlyWatered).toBe(true);
    expect(status.daysUntilDue).toBe(1);
    expect(status.healthState).toBe("stable");
  });

  it("classifies 4-day interval plants with enough buffer as thriving", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        wateringIntervalDays: 4,
        lastWateredAt: "2026-03-22T08:00:00.000Z",
      }),
      reminders: [
        createReminder({
          frequencyDays: 4,
          nextDueAt: "2026-03-26T09:00:00.000Z",
        }),
      ],
      logs: [createLog({ loggedAt: "2026-03-22T08:00:00.000Z" })],
      now,
    });

    expect(status.daysSinceWatered).toBe(2);
    expect(status.daysUntilDue).toBe(2);
    expect(status.recentWateredWindowDays).toBe(2);
    expect(status.thrivingBufferDays).toBe(2);
    expect(status.healthState).toBe("thriving");
  });

  it("classifies 14-day interval plants with enough buffer as thriving", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        wateringIntervalDays: 14,
        lastWateredAt: "2026-03-20T08:00:00.000Z",
      }),
      reminders: [
        createReminder({
          frequencyDays: 14,
          nextDueAt: "2026-03-30T09:00:00.000Z",
        }),
      ],
      logs: [createLog({ loggedAt: "2026-03-20T08:00:00.000Z" })],
      now,
    });

    expect(status.daysSinceWatered).toBe(4);
    expect(status.daysUntilDue).toBe(6);
    expect(status.recentWateredWindowDays).toBe(5);
    expect(status.thrivingBufferDays).toBe(4);
    expect(status.healthState).toBe("thriving");
  });

  it("falls back to stable when a plant is neither urgent nor thriving", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        lastWateredAt: "2026-03-18T08:00:00.000Z",
      }),
      reminders: [
        createReminder({ nextDueAt: "2026-03-26T09:00:00.000Z" }),
      ],
      logs: [],
      now,
    });

    expect(status.isDue).toBe(false);
    expect(status.isOverdue).toBe(false);
    expect(status.healthState).toBe("stable");
  });

  it("stays stable when there is no real watering event, even with a valid schedule", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        lastWateredAt: null,
      }),
      reminders: [
        createReminder({
          nextDueAt: "2026-03-30T09:00:00.000Z",
        }),
      ],
      logs: [],
      now,
    });

    expect(status.daysSinceWatered).toBe(null);
    expect(status.isRecentlyWatered).toBe(false);
    expect(status.healthState).toBe("stable");
  });

  it("stays stable without a valid due schedule instead of guessing thriving", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        wateringIntervalDays: 0,
        lastWateredAt: "2026-03-23T08:00:00.000Z",
        nextWaterDueAt: null,
      }),
      reminders: [],
      logs: [],
      now,
    });

    expect(status.effectiveNextWateringDate).toBe(null);
    expect(status.effectiveNextWateringSource).toBe("none");
    expect(status.healthState).toBe("stable");
  });

  it("prefers stable over thriving when interval-based thresholds are not met", () => {
    const status = derivePlantStatus({
      plant: createPlant({
        wateringIntervalDays: 14,
        lastWateredAt: "2026-03-18T08:00:00.000Z",
      }),
      reminders: [
        createReminder({
          frequencyDays: 14,
          nextDueAt: "2026-03-30T09:00:00.000Z",
        }),
      ],
      logs: [createLog({ loggedAt: "2026-03-18T08:00:00.000Z" })],
      now,
    });

    expect(status.daysSinceWatered).toBe(6);
    expect(status.recentWateredWindowDays).toBe(5);
    expect(status.healthState).toBe("stable");
  });

  it("remains deterministic across repeated runs", () => {
    const input = {
      plant: createPlant({
        lastWateredAt: "2026-03-23T08:00:00.000Z",
      }),
      reminders: [
        createReminder({ nextDueAt: "2026-03-29T09:00:00.000Z" }),
      ],
      logs: [createLog({ loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    };

    const first = derivePlantStatus(input);
    const second = derivePlantStatus(input);

    expect(second).toEqual(first);
  });
});

import {
  buildPlantStatusMap,
  getLibraryPlantBadgeLabel,
} from "@/features/plants/services/plantLibraryStatusService";
import type { CareLog, CareReminder, Plant } from "@/types/models";

function createPlant(id: string, overrides?: Partial<Plant>): Plant {
  return {
    id,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createReminder(plantId: string, overrides?: Partial<CareReminder>): CareReminder {
  return {
    id: `reminder-${plantId}`,
    userId: "user-1",
    plantId,
    reminderType: "water",
    frequencyDays: 7,
    enabled: 1,
    nextDueAt: "2026-03-28T09:00:00.000Z",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(plantId: string, overrides?: Partial<CareLog>): CareLog {
  return {
    id: `log-${plantId}`,
    userId: "user-1",
    plantId,
    logType: "water",
    loggedAt: "2026-03-20T08:00:00.000Z",
    createdAt: "2026-03-20T08:00:00.000Z",
    updatedAt: "2026-03-20T08:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

describe("plantLibraryStatusService", () => {
  const now = new Date("2026-03-24T10:00:00.000Z");

  it("maps library badges from canonical plant health states", () => {
    const plants = [
      createPlant("thriving", {
        lastWateredAt: "2026-03-23T08:00:00.000Z",
      }),
      createPlant("due"),
      createPlant("stable", {
        wateringIntervalDays: 0,
        nextWaterDueAt: null,
      }),
    ];

    const statusMap = buildPlantStatusMap({
      plants,
      reminders: [
        createReminder("thriving", {
          nextDueAt: "2026-03-29T09:00:00.000Z",
        }),
        createReminder("due", {
          nextDueAt: "2026-03-24T09:00:00.000Z",
        }),
      ],
      logs: [createLog("thriving", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(getLibraryPlantBadgeLabel(statusMap.get("thriving")!)).toBe("THRIVING");
    expect(getLibraryPlantBadgeLabel(statusMap.get("due")!)).toBe("NEEDS WATER");
    expect(getLibraryPlantBadgeLabel(statusMap.get("stable")!)).toBe("STABLE");
  });

  it("never marks plants without a valid schedule as thriving", () => {
    const statusMap = buildPlantStatusMap({
      plants: [
        createPlant("unscheduled", {
          wateringIntervalDays: 0,
          lastWateredAt: "2026-03-23T08:00:00.000Z",
          nextWaterDueAt: null,
        }),
      ],
      reminders: [],
      logs: [],
      now,
    });

    const status = statusMap.get("unscheduled");

    expect(status?.healthState).toBe("stable");
    expect(getLibraryPlantBadgeLabel(status!)).toBe("STABLE");
  });
});

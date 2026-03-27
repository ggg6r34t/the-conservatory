import { selectPlantHighlights } from "@/features/plants/services/plantSelectionService";
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

describe("plantSelectionService", () => {
  const now = new Date("2026-03-24T10:00:00.000Z");

  it("prioritizes an overdue plant as featured", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("overdue"),
        createPlant("thriving", {
          updatedAt: "2026-03-24T09:00:00.000Z",
          lastWateredAt: "2026-03-23T08:00:00.000Z",
        }),
      ],
      reminders: [
        createReminder("overdue", {
          nextDueAt: "2026-03-23T08:00:00.000Z",
        }),
        createReminder("thriving", {
          nextDueAt: "2026-03-29T08:00:00.000Z",
        }),
      ],
      logs: [createLog("thriving", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(selection.featuredPlant?.plant.id).toBe("overdue");
  });

  it("sorts secondary plants by closest due date first", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("featured", {
          updatedAt: "2026-03-24T09:00:00.000Z",
          lastWateredAt: "2026-03-23T08:00:00.000Z",
        }),
        createPlant("soon"),
        createPlant("later"),
      ],
      reminders: [
        createReminder("featured", {
          nextDueAt: "2026-03-30T08:00:00.000Z",
        }),
        createReminder("soon", {
          nextDueAt: "2026-03-25T08:00:00.000Z",
        }),
        createReminder("later", {
          nextDueAt: "2026-03-27T08:00:00.000Z",
        }),
      ],
      logs: [createLog("featured", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(selection.featuredPlant?.plant.id).toBe("featured");
    expect(selection.secondaryPlants.map((item) => item.plant.id)).toEqual([
      "soon",
      "later",
    ]);
  });

  it("uses the effective next watering date as the single source for secondary ordering", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("featured", {
          updatedAt: "2026-03-24T09:00:00.000Z",
          lastWateredAt: "2026-03-23T08:00:00.000Z",
        }),
        createPlant("plant-source", {
          nextWaterDueAt: "2026-03-25T08:00:00.000Z",
          updatedAt: "2026-03-24T08:00:00.000Z",
        }),
        createPlant("derived-source", {
          lastWateredAt: "2026-03-22T08:00:00.000Z",
          nextWaterDueAt: "2026-03-29T08:00:00.000Z",
          updatedAt: "2026-03-20T08:00:00.000Z",
        }),
      ],
      reminders: [
        createReminder("featured", {
          nextDueAt: "2026-03-30T08:00:00.000Z",
        }),
      ],
      logs: [createLog("featured", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(
      selection.secondaryPlants.map((item) => ({
        id: item.plant.id,
        due: item.status.effectiveNextWateringDate,
        source: item.status.effectiveNextWateringSource,
      })),
    ).toEqual([
      {
        id: "plant-source",
        due: "2026-03-25T08:00:00.000Z",
        source: "plant",
      },
      {
        id: "derived-source",
        due: "2026-03-29T08:00:00.000Z",
        source: "derived",
      },
    ]);
  });

  it("is deterministic across repeated runs", () => {
    const input = {
      plants: [
        createPlant("a", { updatedAt: "2026-03-24T08:00:00.000Z" }),
        createPlant("b", { updatedAt: "2026-03-24T07:00:00.000Z" }),
        createPlant("c", { updatedAt: "2026-03-24T06:00:00.000Z" }),
      ],
      reminders: [
        createReminder("a", { nextDueAt: "2026-03-28T08:00:00.000Z" }),
        createReminder("b", { nextDueAt: "2026-03-25T08:00:00.000Z" }),
        createReminder("c", { nextDueAt: "2026-03-26T08:00:00.000Z" }),
      ],
      logs: [] as CareLog[],
      now,
    };

    const first = selectPlantHighlights(input);
    const second = selectPlantHighlights(input);

    expect(first.featuredPlant?.plant.id).toBe(second.featuredPlant?.plant.id);
    expect(first.secondaryPlants.map((item) => item.plant.id)).toEqual(
      second.secondaryPlants.map((item) => item.plant.id),
    );
  });

  it("breaks secondary ties deterministically", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("featured", {
          updatedAt: "2026-03-24T09:00:00.000Z",
          lastWateredAt: "2026-03-23T08:00:00.000Z",
        }),
        createPlant("alpha", { updatedAt: "2026-03-20T08:00:00.000Z" }),
        createPlant("beta", { updatedAt: "2026-03-20T08:00:00.000Z" }),
      ],
      reminders: [
        createReminder("featured", {
          nextDueAt: "2026-03-30T08:00:00.000Z",
        }),
        createReminder("alpha", {
          nextDueAt: "2026-03-26T08:00:00.000Z",
        }),
        createReminder("beta", {
          nextDueAt: "2026-03-26T08:00:00.000Z",
        }),
      ],
      logs: [createLog("featured", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(selection.secondaryPlants.map((item) => item.plant.id)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("only marks due or overdue secondary plants as needing attention", () => {
    const selection = selectPlantHighlights({
      plants: [createPlant("due"), createPlant("stable"), createPlant("thriving")],
      reminders: [
        createReminder("due", { nextDueAt: "2026-03-24T09:00:00.000Z" }),
        createReminder("stable", { nextDueAt: "2026-03-26T09:00:00.000Z" }),
        createReminder("thriving", { nextDueAt: "2026-03-29T09:00:00.000Z" }),
      ],
      logs: [
        createLog("thriving", { loggedAt: "2026-03-23T08:00:00.000Z" }),
      ],
      now,
    });

    expect(selection.featuredPlant?.status.healthState).toBe("needs_attention");
    expect(
      selection.secondaryPlants.find((item) => item.plant.id === "stable")?.status
        .healthState,
    ).toBe("stable");
  });

  it("returns fewer than two secondary plants when fewer qualify", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("featured", {
          updatedAt: "2026-03-24T09:00:00.000Z",
          lastWateredAt: "2026-03-23T08:00:00.000Z",
        }),
        createPlant("scheduled", {
          nextWaterDueAt: "2026-03-27T08:00:00.000Z",
        }),
        createPlant("unscheduled", {
          nextWaterDueAt: null,
          wateringIntervalDays: 0,
        }),
      ],
      reminders: [
        createReminder("featured", {
          nextDueAt: "2026-03-30T08:00:00.000Z",
        }),
      ],
      logs: [createLog("featured", { loggedAt: "2026-03-23T08:00:00.000Z" })],
      now,
    });

    expect(selection.featuredPlant?.plant.id).toBe("featured");
    expect(selection.secondaryPlants.map((item) => item.plant.id)).toEqual([
      "scheduled",
    ]);
  });

  it("returns no featured or secondary plants when there are no active plants", () => {
    const selection = selectPlantHighlights({
      plants: [
        createPlant("archived", { status: "archived" }),
        createPlant("memorial", { status: "memorial" }),
      ],
      reminders: [],
      logs: [],
      now,
    });

    expect(selection.featuredPlant).toBeNull();
    expect(selection.secondaryPlants).toEqual([]);
  });
});

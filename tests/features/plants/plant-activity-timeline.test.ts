import {
  buildPlantActivitySections,
  getPlantActivityBody,
} from "@/features/plants/services/plantActivityTimeline";
import type { PlantWithRelations } from "@/types/models";

const fixture: PlantWithRelations = {
  plant: {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
  },
  photos: [],
  reminders: [],
  logs: [
    {
      id: "log-1",
      userId: "user-1",
      plantId: "plant-1",
      logType: "inspect",
      currentCondition: "Healthy",
      notes: "Checked the newest leaf.",
      loggedAt: "2026-03-25T09:00:00.000Z",
      createdAt: "2026-03-25T09:00:00.000Z",
      updatedAt: "2026-03-25T09:00:00.000Z",
      pending: 0,
    },
    {
      id: "log-2",
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
      currentCondition: null,
      notes: "Deep watering and full drain.",
      loggedAt: "2026-03-25T06:30:00.000Z",
      createdAt: "2026-03-25T06:30:00.000Z",
      updatedAt: "2026-03-25T06:30:00.000Z",
      pending: 0,
    },
    {
      id: "log-3",
      userId: "user-1",
      plantId: "plant-1",
      logType: "prune",
      currentCondition: null,
      notes: "Removed one yellow lower leaf.",
      loggedAt: "2026-03-12T11:15:00.000Z",
      createdAt: "2026-03-12T11:15:00.000Z",
      updatedAt: "2026-03-12T11:15:00.000Z",
      pending: 0,
    },
  ],
};

describe("plantActivityTimeline", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-25T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("groups logs into dated sections with TODAY for current-day entries", () => {
    const sections = buildPlantActivitySections(fixture);

    expect(sections).toHaveLength(2);
    expect(sections[0]?.label).toBe("TODAY");
    expect(sections[0]?.items.map((item) => item.id)).toEqual(["log-1", "log-2"]);
    expect(sections[1]?.label).toBe("MARCH 12, 2026");
    expect(sections[1]?.items.map((item) => item.id)).toEqual(["log-3"]);
  });

  it("uses parsed note bodies instead of fabricated activity copy", () => {
    expect(getPlantActivityBody("water", "Deep watering and full drain.")).toBe(
      "Deep watering and full drain.",
    );
  });

  it("returns no sections when there are no saved logs", () => {
    expect(buildPlantActivitySections({ logs: [] })).toEqual([]);
  });
});

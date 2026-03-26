import { buildMonthlyHighlightSections } from "@/features/journal/utils/buildMonthlyHighlightSections";
import type { CareLog } from "@/types/models";

describe("buildMonthlyHighlightSections", () => {
  it("groups highlights by month and sorts sections and items descending", () => {
    const items = [
      {
        id: "plant-1",
        name: "Monstera Deliciosa",
        speciesName: "Monstera deliciosa",
        imageUri: "monstera.jpg",
        updatedAt: "2026-03-18T09:00:00.000Z",
        location: "Living Room",
      },
      {
        id: "plant-2",
        name: "Ficus Elastica",
        speciesName: "Ficus elastica",
        imageUri: "ficus.jpg",
        updatedAt: "2026-02-09T09:00:00.000Z",
        location: "Study",
      },
      {
        id: "plant-3",
        name: "Pilea",
        speciesName: "Pilea peperomioides",
        imageUri: "pilea.jpg",
        updatedAt: "2026-03-11T09:00:00.000Z",
        location: "Kitchen",
      },
    ];

    const logs: CareLog[] = [
      {
        id: "log-1",
        userId: "user-1",
        plantId: "plant-1",
        logType: "water",
        currentCondition: null,
        notes: null,
        loggedAt: "2026-03-24T08:30:00.000Z",
        createdAt: "2026-03-24T08:30:00.000Z",
        updatedAt: "2026-03-24T08:30:00.000Z",
        pending: 0,
      },
      {
        id: "log-2",
        userId: "user-1",
        plantId: "plant-2",
        logType: "feed",
        currentCondition: null,
        notes: null,
        loggedAt: "2026-02-21T08:30:00.000Z",
        createdAt: "2026-02-21T08:30:00.000Z",
        updatedAt: "2026-02-21T08:30:00.000Z",
        pending: 0,
      },
    ];

    const result = buildMonthlyHighlightSections({ items, logs });

    expect(result).toHaveLength(2);
    expect(result[0]?.monthLabel).toBe("March 2026");
    expect(result[0]?.seasonLabel).toBe("EARLY SPRING AWAKENING");
    expect(result[1]?.monthLabel).toBe("February 2026");
    expect(result[0]?.items.map((item) => item.id)).toEqual([
      "plant-1",
      "plant-3",
    ]);
    expect(result[0]?.items[0]?.dateLabel).toBe("MAR 24");
    expect(result[0]?.items[0]?.metadata).toBe("LIVING ROOM");
  });
});

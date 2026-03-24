jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { buildHealthSignalAnalysis } from "@/features/ai/services/healthSignalAnalysisService";
import type { PlantWithRelations } from "@/types/models";

function createFixture(
  overrides?: Partial<PlantWithRelations>,
): PlantWithRelations {
  return {
    plant: {
      id: "plant-1",
      userId: "user-1",
      name: "Aster",
      speciesName: "Monstera deliciosa",
      status: "active",
      wateringIntervalDays: 7,
      lastWateredAt: "2026-03-15T10:00:00.000Z",
      nextWaterDueAt: "2099-03-22T10:00:00.000Z",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-20T10:00:00.000Z",
      pending: 0,
    },
    reminders: [],
    photos: [
      {
        id: "photo-1",
        userId: "user-1",
        plantId: "plant-1",
        localUri: "file://recent.jpg",
        isPrimary: 1,
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      {
        id: "photo-2",
        userId: "user-1",
        plantId: "plant-1",
        localUri: "file://older.jpg",
        isPrimary: 0,
        createdAt: "2026-03-10T10:00:00.000Z",
        updatedAt: "2026-03-10T10:00:00.000Z",
        pending: 0,
      },
    ],
    logs: [
      {
        id: "log-1",
        userId: "user-1",
        plantId: "plant-1",
        logType: "note",
        notes: "New growth is starting to unfurl near the stem.",
        loggedAt: "2026-03-20T10:00:00.000Z",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      {
        id: "log-2",
        userId: "user-1",
        plantId: "plant-1",
        logType: "water",
        notes: "Soil felt evenly moist.",
        loggedAt: "2026-03-18T10:00:00.000Z",
        createdAt: "2026-03-18T10:00:00.000Z",
        updatedAt: "2026-03-18T10:00:00.000Z",
        pending: 0,
      },
    ],
    ...overrides,
  };
}

describe("healthSignalAnalysisService", () => {
  it("detects steady growth with multi-signal support", () => {
    const result = buildHealthSignalAnalysis(createFixture());

    expect(result.classification).toBe("growth");
    expect(result.confidence).toBeGreaterThanOrEqual(0.68);
    expect(result.localInsight?.body).toContain("steady new growth");
  });

  it("detects mild dryness without diagnostic language", () => {
    const result = buildHealthSignalAnalysis(
      createFixture({
        logs: [
          {
            id: "log-3",
            userId: "user-1",
            plantId: "plant-1",
            logType: "inspect",
            notes: "Leaf edges look yellow and a little dry today.",
            loggedAt: "2026-03-20T10:00:00.000Z",
            createdAt: "2026-03-20T10:00:00.000Z",
            updatedAt: "2026-03-20T10:00:00.000Z",
            pending: 0,
          },
          {
            id: "log-4",
            userId: "user-1",
            plantId: "plant-1",
            logType: "water",
            notes: "Skipped the usual watering window.",
            loggedAt: "2026-03-05T10:00:00.000Z",
            createdAt: "2026-03-05T10:00:00.000Z",
            updatedAt: "2026-03-05T10:00:00.000Z",
            pending: 0,
          },
        ],
      }),
    );

    expect(result.classification).toBe("dryness");
    expect(result.localInsight?.body).toContain("mild dryness");
  });

  it("tracks contradictory signals and lowers confidence", () => {
    const result = buildHealthSignalAnalysis(
      createFixture({
        logs: [
          {
            id: "log-5",
            userId: "user-1",
            plantId: "plant-1",
            logType: "note",
            notes: "New growth is appearing, but edges look yellow and dry.",
            loggedAt: "2026-03-20T10:00:00.000Z",
            createdAt: "2026-03-20T10:00:00.000Z",
            updatedAt: "2026-03-20T10:00:00.000Z",
            pending: 0,
          },
        ],
      }),
    );

    expect(result.signalSummary.contradictionCount).toBe(1);
    expect(result.confidence).toBeLessThan(0.75);
  });
});

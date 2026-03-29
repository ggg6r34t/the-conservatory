import type { PlantListItem } from "@/features/plants/api/plantsClient";
import {
  MONTHLY_HIGHLIGHTS_PER_MONTH,
  buildMonthlyHighlights,
} from "@/features/journal/services/monthlyHighlightsService";
import type { CareLog, Photo } from "@/types/models";

function createPlant(
  id: string,
  overrides?: Partial<PlantListItem>,
): PlantListItem {
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

function createPhoto(
  id: string,
  plantId: string,
  overrides?: Partial<Photo>,
): Photo {
  return {
    id,
    userId: "user-1",
    plantId,
    localUri: `file:///${id}.jpg`,
    photoRole: "progress",
    isPrimary: 0,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(
  id: string,
  plantId: string,
  loggedAt: string,
  overrides?: Partial<CareLog>,
): CareLog {
  return {
    id,
    userId: "user-1",
    plantId,
    logType: "note",
    loggedAt,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    pending: 0,
    ...overrides,
  };
}

describe("buildMonthlyHighlights", () => {
  it("only qualifies progress photos and ignores primary photos", () => {
    const result = buildMonthlyHighlights({
      plants: [createPlant("primary"), createPlant("progress")],
      photos: [
        createPhoto("photo-primary", "primary", {
          photoRole: "primary",
          isPrimary: 1,
          capturedAt: "2026-03-05T10:00:00.000Z",
        }),
        createPhoto("photo-progress", "progress", {
          capturedAt: "2026-03-06T10:00:00.000Z",
        }),
      ],
      logs: [],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.items.map((item) => item.id)).toEqual([
      "progress",
    ]);
  });

  it("assigns months using capturedAt, then takenAt, then createdAt", () => {
    const result = buildMonthlyHighlights({
      plants: [
        createPlant("captured"),
        createPlant("taken"),
        createPlant("created"),
      ],
      photos: [
        createPhoto("photo-captured", "captured", {
          capturedAt: "2026-02-08T10:00:00.000Z",
          takenAt: "2026-03-08T10:00:00.000Z",
          createdAt: "2026-04-08T10:00:00.000Z",
        }),
        createPhoto("photo-taken", "taken", {
          capturedAt: null,
          takenAt: "2026-03-12T10:00:00.000Z",
          createdAt: "2026-01-12T10:00:00.000Z",
        }),
        createPhoto("photo-created", "created", {
          capturedAt: null,
          takenAt: null,
          createdAt: "2026-01-03T10:00:00.000Z",
        }),
      ],
      logs: [],
    });

    expect(result.sections.map((section) => section.key)).toEqual([
      "2026-03",
      "2026-02",
      "2026-01",
    ]);
    expect(result.sections[0]?.items[0]?.id).toBe("taken");
    expect(result.sections[1]?.items[0]?.id).toBe("captured");
    expect(result.sections[2]?.items[0]?.id).toBe("created");
  });

  it("ranks deterministically and enforces the per-month cap", () => {
    const result = buildMonthlyHighlights({
      plants: [
        createPlant("plant-a"),
        createPlant("plant-b"),
        createPlant("plant-c"),
        createPlant("plant-z"),
      ],
      photos: [
        createPhoto("a-1", "plant-a", {
          capturedAt: "2026-03-21T10:00:00.000Z",
        }),
        createPhoto("a-2", "plant-a", {
          capturedAt: "2026-03-25T10:00:00.000Z",
        }),
        createPhoto("b-1", "plant-b", {
          capturedAt: "2026-03-29T10:00:00.000Z",
        }),
        createPhoto("c-1", "plant-c", {
          capturedAt: "2026-03-28T10:00:00.000Z",
        }),
        createPhoto("z-1", "plant-z", {
          capturedAt: "2026-03-28T10:00:00.000Z",
        }),
      ],
      logs: [
        createLog("log-a", "plant-a", "2026-03-22T08:00:00.000Z"),
        createLog("log-b-1", "plant-b", "2026-03-11T08:00:00.000Z"),
        createLog("log-b-2", "plant-b", "2026-03-12T08:00:00.000Z"),
      ],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.items).toHaveLength(MONTHLY_HIGHLIGHTS_PER_MONTH);
    expect(result.sections[0]?.items.map((item) => item.id)).toEqual([
      "plant-a",
      "plant-b",
      "plant-c",
    ]);
  });

  it("uses deterministic tie-breaking when all ranking signals match", () => {
    const result = buildMonthlyHighlights({
      plants: [createPlant("plant-a"), createPlant("plant-b")],
      photos: [
        createPhoto("a-1", "plant-a", {
          capturedAt: "2026-03-20T10:00:00.000Z",
        }),
        createPhoto("b-1", "plant-b", {
          capturedAt: "2026-03-20T10:00:00.000Z",
        }),
      ],
      logs: [],
    });

    expect(result.sections[0]?.items.map((item) => item.id)).toEqual([
      "plant-a",
      "plant-b",
    ]);
  });

  it("returns an empty result when no qualifying progress photos exist", () => {
    const result = buildMonthlyHighlights({
      plants: [createPlant("primary-only")],
      photos: [
        createPhoto("primary-only-photo", "primary-only", {
          photoRole: "primary",
          isPrimary: 1,
          capturedAt: "2026-03-05T10:00:00.000Z",
        }),
      ],
      logs: [],
    });

    expect(result.sections).toEqual([]);
    expect(result.previewItems).toEqual([]);
  });
});

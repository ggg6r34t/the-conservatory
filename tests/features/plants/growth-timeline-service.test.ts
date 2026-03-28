import { buildGrowthTimeline } from "@/features/plants/services/growthTimelineService";
import type { PlantWithRelations } from "@/types/models";

const baseData: PlantWithRelations = {
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
  logs: [],
};

describe("buildGrowthTimeline", () => {
  it("excludes primary photos and duplicate photo ids", () => {
    const timeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///primary.jpg",
          photoRole: "primary",
          isPrimary: 1,
          capturedAt: "2026-03-01T10:00:00.000Z",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-2",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///progress.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T10:00:00.000Z",
          updatedAt: "2026-03-02T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-2",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///progress-duplicate.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-03T10:00:00.000Z",
          createdAt: "2026-03-03T10:00:00.000Z",
          updatedAt: "2026-03-03T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.id).toBe("photo-2");
    expect(timeline[0]?.imageUri).toBe("file:///progress.jpg");
  });

  it("orders by capturedAt first, then takenAt, then createdAt", () => {
    const timeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-c",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///c.jpg",
          photoRole: "progress",
          isPrimary: 0,
          createdAt: "2026-03-06T10:00:00.000Z",
          updatedAt: "2026-03-06T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-b",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///b.jpg",
          photoRole: "progress",
          isPrimary: 0,
          takenAt: "2026-03-05T10:00:00.000Z",
          createdAt: "2026-03-07T10:00:00.000Z",
          updatedAt: "2026-03-07T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-a",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///a.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-04T10:00:00.000Z",
          takenAt: "2026-03-09T10:00:00.000Z",
          createdAt: "2026-03-09T10:00:00.000Z",
          updatedAt: "2026-03-09T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(timeline.map((item) => item.id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
    ]);
  });

  it("returns an empty timeline when no valid progress photos exist", () => {
    expect(buildGrowthTimeline(baseData)).toEqual([]);
  });

  it("returns an empty timeline when only primary photos exist", () => {
    const timeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-primary",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///primary.jpg",
          photoRole: "primary",
          isPrimary: 1,
          capturedAt: "2026-03-01T10:00:00.000Z",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(timeline).toEqual([]);
  });

  it("uses raw timestamp fields as deterministic tie-breakers when resolved timestamps match", () => {
    const timeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-b",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///b.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-10T10:00:00.000Z",
          takenAt: "2026-03-10T10:00:00.000Z",
          createdAt: "2026-03-11T10:00:00.000Z",
          updatedAt: "2026-03-11T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-a",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///a.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-10T10:00:00.000Z",
          takenAt: "2026-03-10T10:00:00.000Z",
          createdAt: "2026-03-11T10:00:00.000Z",
          updatedAt: "2026-03-11T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(timeline.map((item) => item.id)).toEqual(["photo-a", "photo-b"]);
  });

  it("handles one-photo and two-photo datasets without duplication", () => {
    const onePhotoTimeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///one.jpg",
          photoRole: "progress",
          isPrimary: 0,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    const twoPhotoTimeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///one.jpg",
          photoRole: "progress",
          isPrimary: 0,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          pending: 0,
        },
        {
          id: "photo-2",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///two.jpg",
          photoRole: "progress",
          isPrimary: 0,
          createdAt: "2026-03-02T10:00:00.000Z",
          updatedAt: "2026-03-02T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(onePhotoTimeline.map((item) => item.id)).toEqual(["photo-1"]);
    expect(twoPhotoTimeline.map((item) => item.id)).toEqual([
      "photo-1",
      "photo-2",
    ]);
  });

  it("associates a nearby care log without inventing narrative text", () => {
    const timeline = buildGrowthTimeline({
      ...baseData,
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///progress.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-10T10:00:00.000Z",
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
          logType: "water",
          notes: "Deep watering after the soil dried out.",
          loggedAt: "2026-03-11T10:00:00.000Z",
          createdAt: "2026-03-11T10:00:00.000Z",
          updatedAt: "2026-03-11T10:00:00.000Z",
          pending: 0,
        },
      ],
    });

    expect(timeline[0]?.associatedLog).toEqual(
      expect.objectContaining({
        id: "log-1",
        title: "Water log",
        body: "Deep watering after the soil dried out.",
      }),
    );
  });
});

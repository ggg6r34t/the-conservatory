import {
  CARE_CALENDAR_MAX_DAY_CARE_ICONS,
  CARE_CALENDAR_MAX_DAY_PLANT_AVATARS,
  buildDayMarkerAccessibilityDetail,
  deriveCareCalendarDayMarkers,
} from "@/features/care-calendar/services/careCalendarDayMarkers";
import type { CareCalendarEvent } from "@/features/care-calendar/types";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

function createPlant(overrides?: Partial<PlantListItem>): PlantListItem {
  return {
    id: "plant-a",
    userId: "user-1",
    name: "Aloe",
    speciesName: "Aloe vera",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    pending: 0,
    primaryPhotoUri: "file:///aloe.jpg",
    ...overrides,
  };
}

function createEvent(
  overrides: Partial<CareCalendarEvent> & Pick<CareCalendarEvent, "plantId" | "careType">,
): CareCalendarEvent {
  const { plantId, careType } = overrides;
  return {
    id: `event-${plantId}-${careType}`,
    plantName: plantId,
    dueDate: "2026-06-10",
    status: "upcoming",
    source: "manual_reminder",
    ...overrides,
    plantId,
    careType,
  };
}

describe("deriveCareCalendarDayMarkers", () => {
  const plantById = new Map([
    [createPlant().id, createPlant()],
    [
      "plant-b",
      createPlant({
        id: "plant-b",
        name: "Monstera",
        primaryPhotoUri: "file:///monstera.jpg",
      }),
    ],
    ["plant-c", createPlant({ id: "plant-c", name: "Fern", primaryPhotoUri: null })],
    ["plant-d", createPlant({ id: "plant-d", name: "Pothos" })],
    ["plant-e", createPlant({ id: "plant-e", name: "ZZ" })],
  ]);

  it("returns up to two care icons and three plant avatars for active tasks", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({ plantId: "plant-a", careType: "water", status: "overdue" }),
        createEvent({ plantId: "plant-b", careType: "mist", status: "due_today" }),
        createEvent({ plantId: "plant-c", careType: "prune", status: "upcoming" }),
        createEvent({ plantId: "plant-d", careType: "feed", status: "upcoming" }),
        createEvent({ plantId: "plant-e", careType: "inspect", status: "upcoming" }),
      ],
      plantById,
    });

    expect(markers.careTypes).toHaveLength(CARE_CALENDAR_MAX_DAY_CARE_ICONS);
    expect(markers.careTypes).toContain("water");
    expect(markers.plants).toHaveLength(CARE_CALENDAR_MAX_DAY_PLANT_AVATARS);
    expect(markers.plants[0]?.plantId).toBe("plant-a");
    expect(markers.hasOverdue).toBe(true);
  });

  it("ignores completed tasks when building markers", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({
          plantId: "plant-a",
          careType: "water",
          status: "completed",
        }),
      ],
      plantById,
    });

    expect(markers.activeTaskCount).toBe(0);
    expect(markers.careTypes).toEqual([]);
    expect(markers.plants).toEqual([]);
  });

  it("prioritizes overdue plants before upcoming plants", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({
          plantId: "plant-e",
          plantName: "ZZ",
          careType: "inspect",
          status: "upcoming",
        }),
        createEvent({
          plantId: "plant-b",
          plantName: "Monstera",
          careType: "water",
          status: "overdue",
        }),
      ],
      plantById,
    });

    expect(markers.plants[0]?.plantId).toBe("plant-b");
    expect(markers.plants[0]?.photoUri).toBe("file:///monstera.jpg");
  });

  it("ignores skipped tasks when building markers", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({
          plantId: "plant-a",
          careType: "water",
          status: "skipped",
        }),
      ],
      plantById,
    });

    expect(markers.activeTaskCount).toBe(0);
    expect(markers.careTypes).toEqual([]);
    expect(markers.plants).toEqual([]);
  });

  it("includes AI-suggested events when they are present in the day event list", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({
          plantId: "plant-a",
          careType: "repot",
          status: "upcoming",
          source: "ai_suggested",
          isAiSuggested: true,
        }),
      ],
      plantById,
    });

    expect(markers.activeTaskCount).toBe(1);
    expect(markers.careTypes).toEqual(["repot"]);
    expect(markers.plants[0]?.plantId).toBe("plant-a");
  });

  it("prefers due-today care types over upcoming-only types for icon slots", () => {
    const markers = deriveCareCalendarDayMarkers({
      events: [
        createEvent({ plantId: "plant-a", careType: "inspect", status: "upcoming" }),
        createEvent({ plantId: "plant-b", careType: "feed", status: "upcoming" }),
        createEvent({ plantId: "plant-c", careType: "mist", status: "due_today" }),
        createEvent({ plantId: "plant-d", careType: "water", status: "overdue" }),
      ],
      plantById,
    });

    expect(markers.careTypes).toEqual(["water", "mist"]);
  });

  it("builds accessibility detail with verbal overflow, not a visual badge", () => {
    const detail = buildDayMarkerAccessibilityDetail({
      careTypes: ["water", "mist"],
      plants: [
        { plantId: "plant-a", plantName: "Aloe", photoUri: "file:///aloe.jpg" },
      ],
      hasOverdue: true,
      activeTaskCount: 4,
    });

    expect(detail).toContain("4 active tasks");
    expect(detail).toContain("Water");
    expect(detail).toContain("Aloe");
    expect(detail).toContain("plus 3 more");
  });
});

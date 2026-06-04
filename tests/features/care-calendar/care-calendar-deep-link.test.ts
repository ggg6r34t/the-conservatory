import {
  resolveCareCalendarRouteState,
  resolvePlantFocusedCalendarState,
} from "@/features/care-calendar/services/careCalendarDeepLink";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

describe("resolvePlantFocusedCalendarState", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  it("returns specimen-focused description when plantId is provided", () => {
    const state = resolvePlantFocusedCalendarState({
      plantId: "plant-1",
      plantName: "Monstera",
      events: [
        {
          id: "1",
          plantId: "plant-1",
          plantName: "Monstera",
          careType: "water",
          dueDate: "2026-06-10",
          status: "upcoming",
          source: "manual_reminder",
        },
      ],
      now,
    });

    expect(state.description).toBe("Viewing care rhythm for Monstera.");
    expect(state.selectedDateKey).toBe("2026-06-10");
  });

  it("prefers due today events when selecting a day", () => {
    const events: CareCalendarEvent[] = [
      {
        id: "past",
        plantId: "plant-1",
        plantName: "Monstera",
        careType: "water",
        dueDate: "2026-06-10",
        status: "upcoming",
        source: "manual_reminder",
      },
      {
        id: "today",
        plantId: "plant-1",
        plantName: "Monstera",
        careType: "mist",
        dueDate: "2026-06-04",
        status: "due_today",
        source: "manual_reminder",
      },
    ];

    const state = resolvePlantFocusedCalendarState({
      plantId: "plant-1",
      plantName: "Monstera",
      events,
      now,
    });

    expect(state.selectedDateKey).toBe("2026-06-04");
  });
});

describe("resolveCareCalendarRouteState", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  it("honors explicit date query when not plant-focused", () => {
    const state = resolveCareCalendarRouteState({
      dateKey: "2026-06-18",
      events: [],
      now,
    });

    expect(state.selectedDateKey).toBe("2026-06-18");
  });

  it("honors explicit date over plant anchor day", () => {
    const state = resolveCareCalendarRouteState({
      plantId: "plant-1",
      plantName: "Monstera",
      dateKey: "2026-06-20",
      events: [
        {
          id: "1",
          plantId: "plant-1",
          plantName: "Monstera",
          careType: "water",
          dueDate: "2026-06-10",
          status: "upcoming",
          source: "manual_reminder",
        },
      ],
      now,
    });

    expect(state.selectedDateKey).toBe("2026-06-20");
  });
});

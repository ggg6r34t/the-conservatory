import { getVisibleCareCalendarFilters } from "@/features/care-calendar/services/careCalendarFilterOptions";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

function event(careType: CareCalendarEvent["careType"]): CareCalendarEvent {
  return {
    id: `event-${careType}`,
    plantId: "plant-1",
    plantName: "Aloe",
    careType,
    dueDate: "2026-06-10",
    status: "upcoming",
    source: "manual_reminder",
  };
}

describe("getVisibleCareCalendarFilters", () => {
  it("always includes core filters", () => {
    const options = getVisibleCareCalendarFilters({
      events: [],
      showAiFilter: false,
    });

    expect(options.map((option) => option.id)).toEqual([
      "all",
      "water",
      "feed",
      "mist",
      "overdue",
    ]);
  });

  it("adds extended filters only when matching events exist", () => {
    const options = getVisibleCareCalendarFilters({
      events: [event("repot"), event("soil_change")],
      showAiFilter: false,
    });

    expect(options.map((option) => option.id)).toContain("repot");
    expect(options.map((option) => option.id)).toContain("soil_change");
    expect(options.map((option) => option.id)).not.toContain("prune");
  });

  it("includes AI suggested filter when premium", () => {
    const options = getVisibleCareCalendarFilters({
      events: [event("water")],
      showAiFilter: true,
    });

    expect(options.map((option) => option.id)).toContain("ai_suggested");
  });
});

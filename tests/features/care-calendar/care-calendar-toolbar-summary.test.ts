import {
  buildCareCalendarAgendaSummary,
  buildCareCalendarToolbarSummary,
} from "@/features/care-calendar/services/careCalendarToolbarSummary";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

describe("buildCareCalendarToolbarSummary", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  const overdue: CareCalendarEvent = {
    id: "1",
    plantId: "p1",
    plantName: "A",
    careType: "water",
    dueDate: "2026-06-01",
    status: "overdue",
    source: "manual_reminder",
  };

  const dueThisWeek: CareCalendarEvent = {
    id: "2",
    plantId: "p2",
    plantName: "B",
    careType: "mist",
    dueDate: "2026-06-06",
    status: "upcoming",
    source: "manual_reminder",
  };

  const farFuture: CareCalendarEvent = {
    id: "3",
    plantId: "p3",
    plantName: "C",
    careType: "feed",
    dueDate: "2026-08-01",
    status: "upcoming",
    source: "manual_reminder",
  };

  it("uses month summary copy in month view", () => {
    const label = buildCareCalendarToolbarSummary(
      [overdue, dueThisWeek],
      "month",
      now,
    );

    expect(label).toContain("overdue");
    expect(label).toContain("due this week");
  });

  it("uses next-14-days copy in agenda view", () => {
    const label = buildCareCalendarToolbarSummary(
      [overdue, dueThisWeek, farFuture],
      "agenda",
      now,
    );

    expect(label).toContain("overdue");
    expect(label).toContain("in the next 14 days");
    expect(label).not.toContain("due this week");
  });

  it("reports empty agenda window when nothing is active soon", () => {
    expect(buildCareCalendarAgendaSummary([farFuture], now)).toBe(
      "No upcoming care in the next 14 days",
    );
  });
});

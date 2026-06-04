import { buildCareCalendarMonthSummary } from "@/features/care-calendar/services/careCalendarMonthSummary";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

describe("buildCareCalendarMonthSummary", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  it("summarizes overdue and due-this-week counts", () => {
    const summary = buildCareCalendarMonthSummary(
      [
        {
          id: "1",
          plantId: "p1",
          plantName: "A",
          careType: "water",
          dueDate: "2026-06-01",
          status: "overdue",
          source: "manual_reminder",
        },
        {
          id: "2",
          plantId: "p2",
          plantName: "B",
          careType: "mist",
          dueDate: "2026-06-06",
          status: "upcoming",
          source: "manual_reminder",
        },
      ],
      now,
    );

    expect(summary.overdueCount).toBe(1);
    expect(summary.dueThisWeekCount).toBe(1);
    expect(summary.label).toContain("overdue");
  });
});

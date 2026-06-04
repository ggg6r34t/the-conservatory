import { buildCareCalendarDashboardSummary } from "@/features/care-calendar/services/careCalendarDashboardSummary";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

describe("buildCareCalendarDashboardSummary", () => {
  it("includes water, mist, and feed breakdown", () => {
    const summary = buildCareCalendarDashboardSummary([
      {
        id: "1",
        plantId: "p1",
        plantName: "A",
        careType: "water",
        dueDate: "2026-06-05",
        status: "upcoming",
        source: "manual_reminder",
      },
      {
        id: "2",
        plantId: "p2",
        plantName: "B",
        careType: "mist",
        dueDate: "2026-06-06",
        status: "due_today",
        source: "manual_reminder",
      },
      {
        id: "3",
        plantId: "p3",
        plantName: "C",
        careType: "feed",
        dueDate: "2026-06-07",
        status: "upcoming",
        source: "manual_reminder",
      },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.body).toContain("3 upcoming");
    expect(summary.body).toContain("1 water");
    expect(summary.body).toContain("1 mist");
    expect(summary.body).toContain("1 feed");
  });
});

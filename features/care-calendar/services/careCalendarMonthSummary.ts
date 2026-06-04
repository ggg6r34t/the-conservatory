import { addLocalDays, toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

export type CareCalendarMonthSummary = {
  overdueCount: number;
  dueThisWeekCount: number;
  label: string;
};

export function buildCareCalendarMonthSummary(
  events: CareCalendarEvent[],
  now = new Date(),
): CareCalendarMonthSummary {
  const todayKey = toLocalDateKey(now);
  const weekEndKey = toLocalDateKey(addLocalDays(now, 6));

  const overdueCount = events.filter((event) => event.status === "overdue").length;
  const dueThisWeekCount = events.filter((event) => {
    if (event.status !== "due_today" && event.status !== "upcoming") {
      return false;
    }

    return event.dueDate >= todayKey && event.dueDate <= weekEndKey;
  }).length;

  const parts: string[] = [];
  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue`);
  }
  if (dueThisWeekCount > 0) {
    parts.push(`${dueThisWeekCount} due this week`);
  }

  return {
    overdueCount,
    dueThisWeekCount,
    label: parts.length ? parts.join(" · ") : "No active care this week",
  };
}

import { addLocalDays, toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import { buildCareCalendarMonthSummary } from "@/features/care-calendar/services/careCalendarMonthSummary";
import type { CareCalendarEvent, CareCalendarViewMode } from "@/features/care-calendar/types";

export const CARE_CALENDAR_AGENDA_SUMMARY_WINDOW_DAYS = 14;

function isActiveCareEvent(event: CareCalendarEvent): boolean {
  return (
    event.status === "overdue" ||
    event.status === "due_today" ||
    event.status === "upcoming"
  );
}

export function buildCareCalendarAgendaSummary(
  events: CareCalendarEvent[],
  now = new Date(),
  windowDays = CARE_CALENDAR_AGENDA_SUMMARY_WINDOW_DAYS,
): string {
  const todayKey = toLocalDateKey(now);
  const windowEndKey = toLocalDateKey(addLocalDays(now, windowDays - 1));

  const overdueCount = events.filter((event) => event.status === "overdue").length;
  const upcomingInWindow = events.filter((event) => {
    if (!isActiveCareEvent(event) || event.status === "overdue") {
      return false;
    }

    return event.dueDate >= todayKey && event.dueDate <= windowEndKey;
  }).length;

  const parts: string[] = [];
  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue`);
  }
  if (upcomingInWindow > 0) {
    parts.push(
      `${upcomingInWindow} in the next ${windowDays} day${windowDays === 1 ? "" : "s"}`,
    );
  }

  return parts.length
    ? parts.join(" · ")
    : `No upcoming care in the next ${windowDays} days`;
}

export function buildCareCalendarToolbarSummary(
  events: CareCalendarEvent[],
  viewMode: CareCalendarViewMode,
  now = new Date(),
): string {
  if (viewMode === "agenda") {
    return buildCareCalendarAgendaSummary(events, now);
  }

  return buildCareCalendarMonthSummary(events, now).label;
}

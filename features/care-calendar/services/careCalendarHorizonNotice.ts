import { addLocalDays, toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

export const CARE_CALENDAR_DEFAULT_HORIZON_DAYS = 90;
const HORIZON_NOTICE_LEAD_DAYS = 14;

export function buildCareCalendarHorizonNotice(
  events: CareCalendarEvent[],
  horizonDays = CARE_CALENDAR_DEFAULT_HORIZON_DAYS,
  now = new Date(),
): string | null {
  const active = events.filter(
    (event) =>
      event.status === "overdue" ||
      event.status === "due_today" ||
      event.status === "upcoming",
  );

  if (!active.length) {
    return null;
  }

  const horizonEndKey = toLocalDateKey(addLocalDays(now, horizonDays));
  const noticeStartKey = toLocalDateKey(
    addLocalDays(now, horizonDays - HORIZON_NOTICE_LEAD_DAYS),
  );
  const hasEventNearHorizonEnd = active.some(
    (event) => event.dueDate >= noticeStartKey && event.dueDate <= horizonEndKey,
  );

  if (!hasEventNearHorizonEnd) {
    return null;
  }

  return `Some care extends beyond ${horizonDays} days — open Agenda for the full list.`;
}

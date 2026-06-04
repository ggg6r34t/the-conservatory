import { toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

export function resolveCareCalendarRouteState(input: {
  plantId?: string;
  plantName?: string | null;
  dateKey?: string;
  events: CareCalendarEvent[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const parsedDateKey = input.dateKey?.trim();

  if (!input.plantId) {
    const selectedDateKey = parsedDateKey || toLocalDateKey(now);
    return {
      description: undefined as string | undefined,
      selectedDateKey,
      visibleMonth: new Date(`${selectedDateKey}T12:00:00`),
    };
  }

  return resolvePlantFocusedCalendarState({
    plantId: input.plantId,
    plantName: input.plantName,
    events: input.events,
    now,
    dateKey: parsedDateKey,
  });
}

export function resolvePlantFocusedCalendarState(input: {
  plantId?: string;
  plantName?: string | null;
  dateKey?: string;
  events: CareCalendarEvent[];
  now?: Date;
}) {
  if (!input.plantId) {
    return {
      description: undefined as string | undefined,
      selectedDateKey: toLocalDateKey(input.now ?? new Date()),
      visibleMonth: input.now ?? new Date(),
    };
  }

  const plantEvents = input.events
    .filter((event) => event.plantId === input.plantId)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const anchorEvent =
    plantEvents.find(
      (event) => event.status === "due_today" || event.status === "overdue",
    ) ??
    plantEvents.find((event) => event.status === "upcoming") ??
    plantEvents[0];

  const selectedDateKey =
    input.dateKey ?? anchorEvent?.dueDate ?? toLocalDateKey(input.now ?? new Date());
  const visibleMonth = new Date(`${selectedDateKey}T12:00:00`);
  const specimenLabel = input.plantName?.trim() || "This specimen";

  return {
    description: `Viewing care rhythm for ${specimenLabel}.`,
    selectedDateKey,
    visibleMonth,
  };
}

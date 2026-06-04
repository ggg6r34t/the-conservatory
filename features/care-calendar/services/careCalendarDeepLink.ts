import { toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

export function resolvePlantFocusedCalendarState(input: {
  plantId?: string;
  plantName?: string | null;
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

  const selectedDateKey = anchorEvent?.dueDate ?? toLocalDateKey(input.now ?? new Date());
  const visibleMonth = new Date(`${selectedDateKey}T12:00:00`);
  const specimenLabel = input.plantName?.trim() || "This specimen";

  return {
    description: `Viewing care rhythm for ${specimenLabel}.`,
    selectedDateKey,
    visibleMonth,
  };
}

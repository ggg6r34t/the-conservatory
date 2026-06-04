import {
  buildDayMarkerAccessibilityDetail,
  type CareCalendarDayMarkers,
} from "@/features/care-calendar/services/careCalendarDayMarkers";
import { derivePlantStatus } from "@/features/plants/services/plantStatusService";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import type {
  CareCalendarCareType,
  CareCalendarEvent,
  CareCalendarEventSource,
  CareCalendarEventStatus,
} from "@/features/care-calendar/types";
import type {
  CareLog,
  CareReminder,
  CareScheduleSuggestionRecord,
  ReminderType,
} from "@/types/models";

const DEFAULT_HORIZON_DAYS = 90;

export function reminderTypeToCareType(
  reminderType: ReminderType,
): CareCalendarCareType {
  return reminderType;
}

export function careLogTypeToCareType(logType: CareLog["logType"]): CareCalendarCareType {
  if (logType === "pest") {
    return "pest_check";
  }

  return logType;
}

export function toLocalDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addLocalDays(value: Date | string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function isCareCompletedForDate(input: {
  plantId: string;
  careType: CareCalendarCareType;
  dueDateKey: string;
  logs: CareLog[];
}) {
  return input.logs.some((log) => {
    if (log.plantId !== input.plantId) {
      return false;
    }

    return (
      careLogTypeToCareType(log.logType) === input.careType &&
      toLocalDateKey(log.loggedAt) === input.dueDateKey
    );
  });
}

export function resolveEventStatus(input: {
  dueDateKey: string;
  now: Date;
  completed: boolean;
}): CareCalendarEventStatus {
  if (input.completed) {
    return "completed";
  }

  const todayKey = toLocalDateKey(input.now);
  if (input.dueDateKey < todayKey) {
    return "overdue";
  }

  if (input.dueDateKey === todayKey) {
    return "due_today";
  }

  return "upcoming";
}

export function generateRecurringDueDates(input: {
  anchorDueAt: string;
  frequencyDays: number;
  horizonEnd: Date;
}) {
  const dates: string[] = [];
  let cursor = startOfLocalDay(input.anchorDueAt);

  while (cursor.getTime() <= input.horizonEnd.getTime()) {
    dates.push(toLocalDateKey(cursor));
    cursor = addLocalDays(cursor, input.frequencyDays);
  }

  return dates;
}

function buildEvent(input: {
  id: string;
  plantId: string;
  plantName: string;
  careType: CareCalendarCareType;
  dueDateKey: string;
  source: CareCalendarEventSource;
  now: Date;
  logs: CareLog[];
  reminderId?: string;
  reason?: string;
  confidence?: CareCalendarEvent["confidence"];
  isAiSuggested?: boolean;
}): CareCalendarEvent {
  const completed = isCareCompletedForDate({
    plantId: input.plantId,
    careType: input.careType,
    dueDateKey: input.dueDateKey,
    logs: input.logs,
  });

  return {
    id: input.id,
    plantId: input.plantId,
    plantName: input.plantName,
    careType: input.careType,
    dueDate: input.dueDateKey,
    status: resolveEventStatus({
      dueDateKey: input.dueDateKey,
      now: input.now,
      completed,
    }),
    source: input.source,
    confidence: input.confidence,
    reason: input.reason,
    isAiSuggested: input.isAiSuggested,
    reminderId: input.reminderId,
  };
}

function hasEnabledReminderForType(
  reminders: CareReminder[],
  plantId: string,
  reminderType: ReminderType,
) {
  return reminders.some(
    (reminder) =>
      reminder.plantId === plantId &&
      reminder.reminderType === reminderType &&
      Boolean(reminder.enabled),
  );
}

function hasEnabledReminderForCareType(
  reminders: CareReminder[],
  plantId: string,
  careType: CareCalendarCareType,
) {
  return reminders.some(
    (reminder) =>
      reminder.plantId === plantId &&
      Boolean(reminder.enabled) &&
      reminderTypeToCareType(reminder.reminderType) === careType,
  );
}

export function deriveCareCalendarEvents(input: {
  plants: PlantListItem[];
  reminders: CareReminder[];
  schedules?: CareScheduleSuggestionRecord[];
  logs: CareLog[];
  now?: Date;
  horizonDays?: number;
  plantId?: string;
}): CareCalendarEvent[] {
  const now = input.now ?? new Date();
  const horizonDays = input.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const horizonEnd = addLocalDays(now, horizonDays);
  const activePlants = input.plants.filter(
    (plant) =>
      plant.status === "active" &&
      (!input.plantId || plant.id === input.plantId),
  );
  const events: CareCalendarEvent[] = [];
  const seen = new Set<string>();

  const pushEvent = (event: CareCalendarEvent) => {
    const dedupeKey = `${event.plantId}:${event.careType}:${event.dueDate}:${event.source}`;
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    events.push(event);
  };

  for (const plant of activePlants) {
    const plantReminders = input.reminders.filter(
      (reminder) => reminder.plantId === plant.id,
    );
    const plantLogs = input.logs.filter((log) => log.plantId === plant.id);

    for (const reminder of plantReminders) {
      if (!reminder.enabled || !reminder.nextDueAt || reminder.frequencyDays <= 0) {
        continue;
      }

      const careType = reminderTypeToCareType(reminder.reminderType);
      const dueDates = generateRecurringDueDates({
        anchorDueAt: reminder.nextDueAt,
        frequencyDays: reminder.frequencyDays,
        horizonEnd,
      });

      for (const dueDateKey of dueDates) {
        pushEvent(
          buildEvent({
            id: `reminder:${reminder.id}:${dueDateKey}`,
            plantId: plant.id,
            plantName: plant.name,
            careType,
            dueDateKey,
            source: "manual_reminder",
            now,
            logs: input.logs,
            reminderId: reminder.id,
          }),
        );
      }
    }

    const status = derivePlantStatus({
      plant,
      reminders: plantReminders,
      logs: plantLogs,
      now,
    });

    const hasWaterReminder = hasEnabledReminderForType(
      input.reminders,
      plant.id,
      "water",
    );

    if (
      !hasWaterReminder &&
      status.effectiveNextWateringDate &&
      plant.wateringIntervalDays > 0
    ) {
      const anchor = status.effectiveNextWateringDate;
      const source: CareCalendarEventSource =
        status.effectiveNextWateringSource === "derived"
          ? "care_history"
          : status.effectiveNextWateringSource === "plant"
            ? "plant_interval"
            : "default_profile";

      const dueDates = generateRecurringDueDates({
        anchorDueAt: anchor,
        frequencyDays: plant.wateringIntervalDays,
        horizonEnd,
      });

      for (const dueDateKey of dueDates) {
        pushEvent(
          buildEvent({
            id: `plant:${plant.id}:water:${dueDateKey}`,
            plantId: plant.id,
            plantName: plant.name,
            careType: "water",
            dueDateKey,
            source,
            now,
            logs: input.logs,
          }),
        );
      }
    }
  }

  for (const schedule of input.schedules ?? []) {
    if (!schedule.enabled || schedule.frequencyDays <= 0) {
      continue;
    }

    const plant = activePlants.find((candidate) => candidate.id === schedule.plantId);
    if (!plant) {
      continue;
    }

    const careType = schedule.careType as CareCalendarCareType;
    if (hasEnabledReminderForCareType(input.reminders, plant.id, careType)) {
      continue;
    }

    const dueDates = generateRecurringDueDates({
      anchorDueAt: schedule.nextDueAt,
      frequencyDays: schedule.frequencyDays,
      horizonEnd,
    });
    const source: CareCalendarEventSource =
      schedule.source === "ai_suggested" ? "ai_suggested" : "manual_reminder";

    for (const dueDateKey of dueDates) {
      pushEvent(
        buildEvent({
          id: `schedule:${schedule.id}:${dueDateKey}`,
          plantId: plant.id,
          plantName: plant.name,
          careType,
          dueDateKey,
          source,
          now,
          logs: input.logs,
          reason: schedule.reason ?? undefined,
          confidence: (schedule.confidence as CareCalendarEvent["confidence"]) ?? undefined,
          isAiSuggested: schedule.source === "ai_suggested",
        }),
      );
    }
  }

  return events.sort((left, right) => {
    if (left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }

    return left.plantName.localeCompare(right.plantName);
  });
}

export function filterCareCalendarEvents(
  events: CareCalendarEvent[],
  filter: import("@/features/care-calendar/types").CareCalendarFilter,
) {
  if (filter === "all") {
    return events;
  }

  if (filter === "overdue") {
    return events.filter((event) => event.status === "overdue");
  }

  if (filter === "ai_suggested") {
    return events.filter((event) => event.isAiSuggested);
  }

  return events.filter((event) => event.careType === filter);
}

export function groupEventsByDate(events: CareCalendarEvent[]) {
  const grouped = new Map<string, CareCalendarEvent[]>();

  for (const event of events) {
    const bucket = grouped.get(event.dueDate) ?? [];
    bucket.push(event);
    grouped.set(event.dueDate, bucket);
  }

  return grouped;
}

export function getMonthGridDates(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const startOffset = firstOfMonth.getDay();
  const gridStart = addLocalDays(firstOfMonth, -startOffset);
  const days: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    days.push(addLocalDays(gridStart, index));
  }

  return {
    days,
    monthIndex,
    year,
    lastOfMonth,
  };
}

export function isSameLocalMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

export function formatMonthTitle(month: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(month);
}

export function formatAgendaDayTitle(dateKey: string, now = new Date()) {
  const date = new Date(`${dateKey}T12:00:00`);
  const todayKey = toLocalDateKey(now);
  const tomorrowKey = toLocalDateKey(addLocalDays(now, 1));

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === tomorrowKey) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getDefaultCareCalendarDateKey(now = new Date()) {
  return toLocalDateKey(now);
}

export function toggleSelectedDateKey(
  current: string | null,
  dateKey: string,
): string | null {
  return current === dateKey ? null : dateKey;
}

export function buildDayAccessibilityLabel(input: {
  date: Date;
  markers: CareCalendarDayMarkers;
}) {
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(input.date);

  return `${dayLabel}. ${buildDayMarkerAccessibilityDetail(input.markers)}`;
}

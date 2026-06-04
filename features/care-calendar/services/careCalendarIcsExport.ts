import { Directory, File, Paths } from "expo-file-system";

import { getCareTypeLabel } from "@/features/care-calendar/services/careCalendarLabels";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

function formatIcsDateTime(iso: string) {
  const date = new Date(iso);
  const parts = date.toISOString().replace(/[-:]/g, "").split(".");
  return `${parts[0]}Z`;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export function buildCareCalendarIcsDocument(events: CareCalendarEvent[]) {
  const active = events.filter(
    (event) =>
      event.status === "overdue" ||
      event.status === "due_today" ||
      event.status === "upcoming",
  );
  const stamp = formatIcsDateTime(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Conservatory//Care Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of active) {
    const start = event.dueAt ?? `${event.dueDate}T09:00:00.000Z`;
    const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    const summary = `${getCareTypeLabel(event.careType)} · ${event.plantName}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.id)}@the-conservatory`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDateTime(start)}`,
      `DTEND:${formatIcsDateTime(end)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(event.reason ?? "Plant care from The Conservatory")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export async function shareCareCalendarIcs(events: CareCalendarEvent[]) {
  const sharing = await import("expo-sharing").catch(() => null);
  if (!sharing?.isAvailableAsync) {
    return { ok: false as const, reason: "sharing_unavailable" as const };
  }

  const available = await sharing.isAvailableAsync().catch(() => false);
  if (!available) {
    return { ok: false as const, reason: "sharing_unavailable" as const };
  }

  const directory = new Directory(Paths.cache, "care-calendar");
  if (!directory.exists) {
    directory.create();
  }

  const file = new File(directory, `care-calendar-${Date.now()}.ics`);
  file.create({ intermediates: true, overwrite: true });
  file.write(buildCareCalendarIcsDocument(events));

  await sharing.shareAsync(file.uri, {
    dialogTitle: "Export care calendar",
    mimeType: "text/calendar",
    UTI: "public.calendar-event",
  });

  return { ok: true as const };
}

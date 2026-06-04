import type { CareCalendarEvent } from "@/features/care-calendar/types";

export function buildCareCalendarDashboardSummary(events: CareCalendarEvent[]) {
  const active = events.filter(
    (event) => event.status === "upcoming" || event.status === "due_today",
  );
  const water = active.filter((event) => event.careType === "water").length;
  const mist = active.filter((event) => event.careType === "mist").length;
  const feed = active.filter((event) => event.careType === "feed").length;
  const other = active.length - water - mist - feed;

  if (active.length === 0) {
    return {
      total: 0,
      body: "See scheduled watering, feeding, and gentle care moments by day.",
    };
  }

  const parts: string[] = [];
  if (water > 0) {
    parts.push(`${water} water`);
  }
  if (mist > 0) {
    parts.push(`${mist} mist`);
  }
  if (feed > 0) {
    parts.push(`${feed} feed`);
  }
  if (other > 0) {
    parts.push(`${other} other`);
  }

  const breakdown = parts.join(" · ");
  const taskWord = active.length === 1 ? "task" : "tasks";

  return {
    total: active.length,
    body: `${active.length} upcoming care ${taskWord} on your horizon (${breakdown}).`,
  };
}

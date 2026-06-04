import { CARE_CALENDAR_DEFAULT_HORIZON_DAYS } from "@/features/care-calendar/services/careCalendarHorizonNotice";

export const CARE_CALENDAR_HELP_SECTIONS = {
  monthMarkers: {
    title: "Month markers",
    body: "Icons show care types; overlapping circles are plant photos. Red icons mean overdue.",
  },
  scheduleRange: {
    title: "Schedule range",
    body: `Month view shows care for the next ${CARE_CALENDAR_DEFAULT_HORIZON_DAYS} days. Agenda lists your full upcoming schedule.`,
  },
  aiFallback: {
    title: "AI suggestions",
    body: "Cloud AI is unavailable. Showing on-device rhythm hints until you refresh from More (⋯).",
  },
} as const;

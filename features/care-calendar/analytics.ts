import { trackEvent } from "@/services/analytics/analyticsService";

import type { CareCalendarCareType, CareCalendarFilter } from "./types";

export function trackCareCalendarOpened(source: "dashboard" | "reminders" | "plant_detail") {
  trackEvent("care_calendar_opened", { source });
}

export function trackCareCalendarDaySelected(input: {
  task_count: number;
  has_overdue: boolean;
}) {
  trackEvent("care_calendar_day_selected", input);
}

export function trackCareCalendarTaskCompleted(care_type: CareCalendarCareType) {
  trackEvent("care_calendar_task_completed", { care_type });
}

export function trackCareCalendarTaskRescheduled(care_type: CareCalendarCareType) {
  trackEvent("care_calendar_task_rescheduled", { care_type });
}

export function trackCareCalendarFilterUsed(filter: CareCalendarFilter) {
  trackEvent("care_calendar_filter_used", { filter });
}

export function trackAiScheduleSuggestionViewed(count: number) {
  trackEvent("ai_schedule_suggestion_viewed", { count });
}

export function trackAiScheduleSuggestionAccepted(care_type: CareCalendarCareType) {
  trackEvent("ai_schedule_suggestion_accepted", { care_type });
}

export function trackAiScheduleSuggestionDismissed(care_type: CareCalendarCareType) {
  trackEvent("ai_schedule_suggestion_dismissed", { care_type });
}

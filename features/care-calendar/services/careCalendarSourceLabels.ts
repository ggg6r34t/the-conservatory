import type {
  CareCalendarEventSource,
  CareCalendarCareType,
} from "@/features/care-calendar/types";
import { getCareTypeLabel } from "@/features/care-calendar/services/careCalendarLabels";

export function getCareCalendarSourceLabel(input: {
  source: CareCalendarEventSource;
  careType: CareCalendarCareType;
  isAiSuggested?: boolean;
}) {
  if (input.isAiSuggested || input.source === "ai_suggested") {
    return "Suggested care rhythm";
  }

  const careLabel = getCareTypeLabel(input.careType).toLowerCase();

  switch (input.source) {
    case "manual_reminder":
      return `From your ${careLabel} reminder`;
    case "plant_interval":
      return `From this plant's watering interval`;
    case "care_history":
      return `Based on recent ${careLabel} history`;
    case "default_profile":
      return "From your plant's care profile";
    default:
      return "Scheduled care";
  }
}

import type {
  CareCalendarEventSource,
  CareCalendarCareType,
  CareSuggestionDerivation,
} from "@/features/care-calendar/types";
import { getCareTypeLabel } from "@/features/care-calendar/services/careCalendarLabels";

export function getCareCalendarSourceLabel(input: {
  source: CareCalendarEventSource;
  careType: CareCalendarCareType;
  isAiSuggested?: boolean;
  suggestionDerivation?: CareSuggestionDerivation;
}) {
  if (input.isAiSuggested || input.source === "ai_suggested") {
    if (input.suggestionDerivation === "cloud") {
      return "AI-assisted care rhythm";
    }
    if (input.suggestionDerivation === "local") {
      return "On-device rhythm hint";
    }
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

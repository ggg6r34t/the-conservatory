import type { CareCalendarCareType } from "@/features/care-calendar/types";

export function getCareTypeLabel(careType: CareCalendarCareType) {
  switch (careType) {
    case "water":
      return "Water";
    case "mist":
      return "Mist";
    case "feed":
      return "Feed";
    case "repot":
      return "Repot";
    case "prune":
      return "Prune";
    case "inspect":
      return "Inspect";
    case "soil_change":
      return "Soil change";
    case "pest_check":
      return "Pest check";
    case "note":
      return "Note";
    default:
      return careType;
  }
}

export function getCareTypeVerb(careType: CareCalendarCareType) {
  switch (careType) {
    case "water":
      return "Water";
    case "mist":
      return "Mist";
    case "feed":
      return "Feed";
    case "repot":
      return "Repot";
    case "prune":
      return "Prune";
    case "inspect":
      return "Inspect";
    case "soil_change":
      return "Change soil";
    case "pest_check":
      return "Check for pests";
    case "note":
      return "Add note";
    default:
      return getCareTypeLabel(careType);
  }
}

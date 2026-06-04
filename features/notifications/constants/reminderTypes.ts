import type { ReminderType } from "@/types/models";

export const REMINDER_TYPES: ReminderType[] = [
  "water",
  "mist",
  "feed",
  "repot",
  "prune",
  "inspect",
];

export function getReminderTypeLabel(type: ReminderType) {
  switch (type) {
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
    case "water":
    default:
      return "Water";
  }
}

export function getDefaultFrequencyDays(
  type: ReminderType,
  wateringIntervalDays: number,
) {
  if (type === "mist") {
    return 3;
  }

  if (type === "feed") {
    return 30;
  }

  if (type === "repot") {
    return 365;
  }

  if (type === "prune") {
    return 90;
  }

  if (type === "inspect") {
    return 30;
  }

  return wateringIntervalDays;
}

export function isReminderCareType(
  careType: string,
): careType is ReminderType {
  return REMINDER_TYPES.includes(careType as ReminderType);
}

import type { CareLog } from "@/types/models";

function differenceInDays(from: string, to: string) {
  const delta = new Date(from).getTime() - new Date(to).getTime();
  return Math.round(delta / (1000 * 60 * 60 * 24));
}

export function calculatePlantStreak(
  logs: CareLog[],
  wateringIntervalDays: number,
) {
  const waterLogs = logs
    .filter((log) => log.logType === "water")
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));

  if (!waterLogs.length) {
    return 0;
  }

  let streak = 1;

  for (let index = 0; index < waterLogs.length - 1; index += 1) {
    const current = waterLogs[index];
    const previous = waterLogs[index + 1];
    if (
      differenceInDays(current.loggedAt, previous.loggedAt) <=
      wateringIntervalDays + 1
    ) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

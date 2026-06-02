import { useQuery } from "@tanstack/react-query";

import { getStreakRecoveryNudge } from "@/features/ai/services/streakNudgeService";
import { toLocalDayKeyFromDate } from "@/features/plants/services/collectionStreakService";
import { resolveStreakTimeZone } from "@/features/plants/services/streakAnalyticsHelpers";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { CareLog, Plant } from "@/types/models";

export function useStreakRecoveryNudge(input: {
  userId?: string;
  plants: Plant[];
  logs: CareLog[];
}) {
  const settingsQuery = useSettings();
  const timeZone = resolveStreakTimeZone(settingsQuery.data?.timezone);
  const dayKey = toLocalDayKeyFromDate(new Date(), timeZone);
  const latestLogKey = [...input.logs]
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt))[0]
    ?.loggedAt;

  return useQuery({
    queryKey: [
      "ai",
      "streak-nudge",
      input.userId ?? "guest",
      dayKey,
      timeZone,
      input.plants.map((plant) => `${plant.id}:${plant.nextWaterDueAt ?? "none"}`).join("|"),
      latestLogKey ?? "none",
      input.logs.length,
    ],
    enabled: Boolean(input.userId),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getStreakRecoveryNudge({
        userId: input.userId!,
        plants: input.plants,
        logs: input.logs,
        timeZone,
      }),
  });
}

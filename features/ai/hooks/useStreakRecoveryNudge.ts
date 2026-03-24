import { useQuery } from "@tanstack/react-query";

import { getStreakRecoveryNudge } from "@/features/ai/services/streakNudgeService";
import type { CareLog, Plant } from "@/types/models";

export function useStreakRecoveryNudge(input: {
  userId?: string;
  plants: Plant[];
  logs: CareLog[];
}) {
  const latestLogKey = [...input.logs]
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt))[0]
    ?.loggedAt;

  return useQuery({
    queryKey: [
      "ai",
      "streak-nudge",
      input.userId ?? "guest",
      new Date().toISOString().slice(0, 10),
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
      }),
  });
}

import { useQuery } from "@tanstack/react-query";

import { getDashboardInsight } from "@/features/ai/services/dashboardInsightService";
import type { CareReminder, Plant } from "@/types/models";

export function useDashboardInsight(input: {
  userId?: string;
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "ai",
      "dashboard-insight",
      input.userId ?? "guest",
      new Date().toISOString().slice(0, 10),
      input.plants.length,
      input.reminders.length,
      input.currentStreakDays,
      input.plants
        .map((plant) => `${plant.id}:${plant.nextWaterDueAt ?? "none"}`)
        .join("|"),
    ],
    enabled: Boolean(input.userId) && (input.enabled ?? true),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getDashboardInsight({
        userId: input.userId!,
        plants: input.plants,
        reminders: input.reminders,
        currentStreakDays: input.currentStreakDays,
      }),
  });
}

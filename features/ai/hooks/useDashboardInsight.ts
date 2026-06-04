import { useQuery } from "@tanstack/react-query";

import { getDashboardInsight } from "@/features/ai/services/dashboardInsightService";
import { cloudAllowedForFeature } from "@/features/billing/services/featureAccess";
import type { CareReminder, Plant } from "@/types/models";

export function useDashboardInsight(input: {
  userId?: string;
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
  enabled?: boolean;
  isPremium: boolean;
}) {
  const cloudAllowed = cloudAllowedForFeature(
    "ai_dashboard_editorial",
    input.isPremium,
  );

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
      cloudAllowed,
    ],
    enabled: Boolean(input.userId) && (input.enabled ?? true),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getDashboardInsight({
        userId: input.userId!,
        plants: input.plants,
        reminders: input.reminders,
        currentStreakDays: input.currentStreakDays,
        cloudAllowed,
      }),
  });
}

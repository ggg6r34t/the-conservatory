import { useMutation, useQueryClient } from "@tanstack/react-query";

import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import { queryKeys } from "@/config/constants";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserPreferences } from "@/features/settings/api/settingsClient";

export function useSetReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plantId,
      plantName,
      speciesName,
      lastWateredAt,
      lastTriggeredAt,
      frequencyDays,
      nextDueAt,
      enabled,
    }: {
      plantId: string;
      plantName: string;
      speciesName: string;
      lastWateredAt?: string | null;
      lastTriggeredAt?: string | null;
      frequencyDays: number;
      nextDueAt: string | null;
      enabled: boolean;
    }) => {
      const preferences = await getUserPreferences(user!.id);
      const optimized = optimizeReminderTiming({
        plantName,
        speciesName,
        wateringIntervalDays: frequencyDays,
        nextDueAt,
        lastWateredAt: lastWateredAt ?? null,
        lastTriggeredAt: lastTriggeredAt ?? null,
        reminderEnabled: enabled,
        defaultWateringHour: preferences.defaultWateringHour,
      });
      const reminder = await upsertReminder({
        userId: user!.id,
        plantId,
        frequencyDays,
        nextDueAt: optimized.nextDueAt,
        enabled,
      });
      await reschedulePlantReminder(reminder, plantName);
      return reminder;
    },
    onSuccess: (_data, variables) => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.reminders })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plant(variables.plantId) })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
    },
  });
}

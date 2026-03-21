import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSetReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plantId,
      plantName,
      frequencyDays,
      nextDueAt,
      enabled,
    }: {
      plantId: string;
      plantName: string;
      frequencyDays: number;
      nextDueAt: string | null;
      enabled: boolean;
    }) => {
      const reminder = await upsertReminder({
        userId: user!.id,
        plantId,
        frequencyDays,
        nextDueAt,
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

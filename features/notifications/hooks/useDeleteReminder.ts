import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { deleteReminder } from "@/features/notifications/api/remindersClient";
import { cancelReminderNotification } from "@/features/notifications/services/notificationService";

export function useDeleteReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reminderId,
    }: {
      reminderId: string;
      plantId: string;
    }) => {
      const result = await deleteReminder({
        userId: user!.id,
        reminderId,
      });
      await cancelReminderNotification(result.notificationId);
      return result;
    },
    onSuccess: (_result, variables) => {
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

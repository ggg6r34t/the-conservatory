import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listReminders } from "@/features/notifications/api/remindersClient";

export function useReminders(plantId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.reminders, plantId ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: () => listReminders(user!.id, plantId),
  });
}

import { useMemo } from "react";

import { usePlants } from "@/features/plants/hooks/usePlants";
import { useReminders } from "@/features/notifications/hooks/useReminders";

export function useStreaks() {
  const plantsQuery = usePlants();
  const remindersQuery = useReminders();

  return useMemo(
    () => ({
      plantCount: plantsQuery.data?.length ?? 0,
      activeReminders:
        remindersQuery.data?.filter((reminder) => Boolean(reminder.enabled))
          .length ?? 0,
    }),
    [plantsQuery.data, remindersQuery.data],
  );
}

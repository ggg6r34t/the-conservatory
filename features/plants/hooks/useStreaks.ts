import { useMemo } from "react";

import { useReminders } from "@/features/notifications/hooks/useReminders";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";

export function useStreaks() {
  const plantsQuery = useAllActivePlants();
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

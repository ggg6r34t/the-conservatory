import { useMemo } from "react";

import { useReminders } from "@/features/notifications/hooks/useReminders";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";

/** Active plant and reminder counts — not streak metrics. */
export function useCollectionActivityCounts() {
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

/** @deprecated Use useCollectionActivityCounts — this hook never tracked streaks. */
export const useStreaks = useCollectionActivityCounts;

import { useEffect, useMemo, useRef } from "react";

import { useCareLogsForPlantIds } from "@/features/care-logs/hooks/useCareLogsForPlantIds";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { computeCollectionStreak } from "@/features/plants/services/collectionStreakService";
import { resolveStreakTimeZone } from "@/features/plants/services/streakAnalyticsHelpers";
import { trackStreakBrokenOnSession } from "@/features/plants/services/streakAnalyticsService";
import { useSettings } from "@/features/settings/hooks/useSettings";

export { resolveStreakTimeZone };

export function useCollectionStreak() {
  const plantsQuery = useAllActivePlants();
  const settingsQuery = useSettings();
  const plants = plantsQuery.data ?? [];
  const plantIds = plants.map((plant) => plant.id);
  const careLogsQuery = useCareLogsForPlantIds(plantIds, "collection-streak");
  const timeZone = resolveStreakTimeZone(settingsQuery.data?.timezone);
  const isLoading = plantsQuery.isLoading || careLogsQuery.isLoading;
  const previousCurrentRef = useRef<number | null>(null);

  const stats = useMemo(
    () =>
      computeCollectionStreak(careLogsQuery.data ?? [], {
        timeZone,
      }),
    [careLogsQuery.data, timeZone],
  );

  useEffect(() => {
    trackStreakBrokenOnSession({
      previousCurrent: previousCurrentRef.current,
      stats,
      plantCount: plants.length,
      timeZone,
      isLoading,
    });
    previousCurrentRef.current = stats.currentStreak;
  }, [stats, plants.length, timeZone, isLoading]);

  return {
    ...stats,
    isLoading,
    timeZone,
    refetch: careLogsQuery.refetch,
  };
}

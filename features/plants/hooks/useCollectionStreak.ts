import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  careLogsBatchQueryKey,
  useCareLogsForPlantIds,
} from "@/features/care-logs/hooks/useCareLogsForPlantIds";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { computeCollectionStreak, resolveDisplayStreak } from "@/features/plants/services/collectionStreakService";
import { resolveStreakTimeZone } from "@/features/plants/services/streakAnalyticsHelpers";
import { trackStreakBrokenOnSession } from "@/features/plants/services/streakAnalyticsService";
import { useSettings } from "@/features/settings/hooks/useSettings";

export { resolveStreakTimeZone };

export function useCollectionStreak() {
  const queryClient = useQueryClient();
  const plantsQuery = useAllActivePlants();
  const settingsQuery = useSettings();
  const plants = plantsQuery.data ?? [];
  const plantIds = plants.map((plant) => plant.id);
  const careLogsQuery = useCareLogsForPlantIds(plantIds, "collection-streak");
  const timeZone = resolveStreakTimeZone(settingsQuery.data?.timezone);
  const isLoading = plantsQuery.isLoading || careLogsQuery.isLoading;
  const lastStableStreakRef = useRef(0);
  const previousCurrentRef = useRef<number | null>(null);

  const stats = useMemo(
    () =>
      computeCollectionStreak(careLogsQuery.data ?? [], {
        timeZone,
      }),
    [careLogsQuery.data, timeZone],
  );

  const currentStreak = resolveDisplayStreak(
    stats.currentStreak,
    lastStableStreakRef.current,
    careLogsQuery.data,
  );

  useEffect(() => {
    if (careLogsQuery.data !== undefined) {
      lastStableStreakRef.current = stats.currentStreak;
    }
  }, [careLogsQuery.data, stats.currentStreak]);

  useEffect(() => {
    trackStreakBrokenOnSession({
      previousCurrent: previousCurrentRef.current,
      stats: {
        ...stats,
        currentStreak,
      },
      plantCount: plants.length,
      timeZone,
      isLoading,
    });
    previousCurrentRef.current = currentStreak;
  }, [currentStreak, stats, plants.length, timeZone, isLoading]);

  const refreshIfStale = useCallback(() => {
    return queryClient.refetchQueries({
      queryKey: careLogsBatchQueryKey("collection-streak", plantIds),
      stale: true,
    });
  }, [plantIds, queryClient]);

  return {
    ...stats,
    currentStreak,
    isLoading,
    isRefreshing: careLogsQuery.isFetching && careLogsQuery.data !== undefined,
    timeZone,
    refetch: careLogsQuery.refetch,
    refreshIfStale,
  };
}

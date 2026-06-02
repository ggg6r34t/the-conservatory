import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCareLog } from "@/features/care-logs/api/careLogsClient";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";
import { trackStreakChangeAfterCareLog } from "@/features/plants/services/streakAnalyticsService";
import { resolveStreakTimeZone } from "@/features/plants/services/streakAnalyticsHelpers";
import type { CareLogCondition, CareLogType, Plant, UserPreferences } from "@/types/models";

export function useRecordCareEvent(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      logType: CareLogType;
      currentCondition?: CareLogCondition;
      notes?: string;
    }) =>
      createCareLog({
        userId: user!.id,
        plantId,
        ...input,
      }),
    onSuccess: async (result) => {
      const preferences = queryClient.getQueryData<UserPreferences>(
        queryKeys.preferences,
      );
      const plants = queryClient.getQueryData<Plant[]>([
        ...queryKeys.plants,
        "active",
        "all",
      ]);
      const plantIds = plants?.map((plant) => plant.id) ?? [plantId];
      const timeZone = resolveStreakTimeZone(preferences?.timezone);

      await trackStreakChangeAfterCareLog({
        userId: user!.id,
        plantIds,
        timeZone,
        newLog: result.careLog,
      }).catch(() => undefined);

      await invalidateCareLogQueries(queryClient, plantId).catch(
        () => undefined,
      );
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCareLog } from "@/features/care-logs/api/careLogsClient";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";
import type { CareLogCondition, CareLogType } from "@/types/models";

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
    onSuccess: async () => {
      await invalidateCareLogQueries(queryClient, plantId).catch(
        () => undefined,
      );
    },
  });
}

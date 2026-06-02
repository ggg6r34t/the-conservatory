import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { deleteCareLog } from "@/features/care-logs/api/careLogsClient";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";

export function useDeleteCareLog(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (careLogId: string) =>
      deleteCareLog({
        userId: user!.id,
        plantId,
        careLogId,
      }),
    onSuccess: async () => {
      await invalidateCareLogQueries(queryClient, plantId).catch(() => undefined);
    },
  });
}

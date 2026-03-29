import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateCareLogNote } from "@/features/care-logs/api/careLogsClient";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";

export function useUpdateCareLogNote(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      careLogId: string;
      notes: string;
    }) =>
      updateCareLogNote({
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

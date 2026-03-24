import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateGraveyardMemorial } from "@/features/plants/api/plantsClient";

export function useUpdateGraveyardMemorial() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      graveyardId: string;
      causeOfPassing?: string;
      memorialNote?: string;
    }) =>
      updateGraveyardMemorial({
        userId: user!.id,
        ...input,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
  });
}

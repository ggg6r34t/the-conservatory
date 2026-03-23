import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { archivePlant } from "@/features/plants/api/plantsClient";

interface ArchivePlantInput {
  causeOfPassing?: string;
  memorialNote?: string;
}

export function useArchivePlant(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ArchivePlantInput = {}) =>
      archivePlant({
        userId: user!.id,
        plantId,
        causeOfPassing: input.causeOfPassing,
        memorialNote: input.memorialNote,
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.graveyard })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plant(plantId) })
        .catch(() => undefined);
    },
  });
}

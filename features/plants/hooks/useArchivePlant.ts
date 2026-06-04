import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { archivePlant } from "@/features/plants/api/plantsClient";
import { invalidatePlantPhotoQueries } from "@/features/plants/hooks/invalidatePlantPhotoQueries";

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
      invalidatePlantPhotoQueries(queryClient, plantId);
    },
  });
}

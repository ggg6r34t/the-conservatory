import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { restorePlantFromGraveyard } from "@/features/plants/api/plantsClient";
import { invalidatePlantPhotoQueries } from "@/features/plants/hooks/invalidatePlantPhotoQueries";

export function useRestorePlant(plantId: string) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      restorePlantFromGraveyard({
        userId: user!.id,
        plantId,
        isPremium,
      }),
    onSuccess: () => {
      invalidatePlantPhotoQueries(queryClient, plantId);
    },
  });
}

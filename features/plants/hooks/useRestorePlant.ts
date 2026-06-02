import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { restorePlantFromGraveyard } from "@/features/plants/api/plantsClient";

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

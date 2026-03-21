import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { deletePlant } from "@/features/plants/api/plantsClient";

export function useDeletePlant(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deletePlant(user!.id, plantId),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
      queryClient.removeQueries({ queryKey: queryKeys.plant(plantId) });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { addPlantProgressPhoto } from "@/features/plants/api/plantsClient";

export function useAddPlantProgressPhoto(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoUri: string) =>
      addPlantProgressPhoto({
        userId: user!.id,
        plantId,
        photoUri,
      }),
    onSuccess: (data) => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
      queryClient.setQueryData(queryKeys.plant(plantId), data);
    },
  });
}

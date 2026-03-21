import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updatePlant } from "@/features/plants/api/plantsClient";

export function useUpdatePlant(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: {
      name: string;
      speciesName: string;
      nickname?: string;
      location?: string;
      wateringIntervalDays: number;
      notes?: string;
      photoUri?: string;
    }) =>
      updatePlant({
        userId: user!.id,
        plantId,
        patch,
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

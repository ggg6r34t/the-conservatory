import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updatePlant } from "@/features/plants/api/plantsClient";
import { invalidatePlantPhotoQueries } from "@/features/plants/hooks/invalidatePlantPhotoQueries";

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
      photoCapturedAt?: string;
      photoMimeType?: string;
      photoWidth?: number | null;
      photoHeight?: number | null;
    }) =>
      updatePlant({
        userId: user!.id,
        plantId,
        patch,
      }),
    onSuccess: (data) => {
      invalidatePlantPhotoQueries(queryClient, plantId);
      queryClient.setQueryData(queryKeys.plant(plantId), data);
    },
  });
}

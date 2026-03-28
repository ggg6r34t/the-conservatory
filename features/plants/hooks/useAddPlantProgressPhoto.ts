import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { addPlantProgressPhoto } from "@/features/plants/api/plantsClient";
import type { PlantImageAsset } from "@/features/plants/services/photoService";

export function useAddPlantProgressPhoto(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photo: PlantImageAsset) =>
      addPlantProgressPhoto({
        userId: user!.id,
        plantId,
        photoUri: photo.uri,
        capturedAt: photo.capturedAt ?? null,
        mimeType: photo.mimeType ?? null,
        width: photo.width ?? null,
        height: photo.height ?? null,
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

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { canUseFeature } from "@/features/billing/services/entitlementService";
import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { useUsageLimits } from "@/features/billing/hooks/useUsageLimits";
import { addPlantProgressPhoto } from "@/features/plants/api/plantsClient";
import type { PlantImageAsset } from "@/features/plants/services/photoService";

export function useAddPlantProgressPhoto(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tier = useBillingStore((s) => s.tier);
  const isPremium = tier === 'premium';
  const usageLimits = useUsageLimits();

  return useMutation({
    mutationFn: (photo: PlantImageAsset & { caption?: string | null }) => {
      const usage = usageLimits.data;
      if (usage) {
        const access = canUseFeature('progress_photo_upload', isPremium, usage, plantId);
        if (!access.canUse) {
          throw Object.assign(new Error('Photo limit reached'), {
            code: 'PHOTO_LIMIT_REACHED' as const,
          });
        }
      }
      return addPlantProgressPhoto({
        userId: user!.id,
        plantId,
        photoUri: photo.uri,
        capturedAt: photo.capturedAt ?? null,
        mimeType: photo.mimeType ?? null,
        width: photo.width ?? null,
        height: photo.height ?? null,
        caption: photo.caption ?? null,
      });
    },
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

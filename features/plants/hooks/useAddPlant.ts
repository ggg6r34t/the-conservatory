import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { createPlant } from "@/features/plants/api/plantsClient";

export function useAddPlant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tier = useBillingStore((s) => s.tier);
  const isPremium = tier === 'premium';

  return useMutation({
    mutationFn: (input: {
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
      createPlant({
        userId: user!.id,
        isPremium,
        ...input,
      }),
    onSuccess: (data) => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
      queryClient.setQueryData(queryKeys.plant(data.plant.id), data);
    },
  });
}

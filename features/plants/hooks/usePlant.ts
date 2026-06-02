import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { getFreeCareLogHistorySince } from "@/features/care-logs/services/careLogHistoryService";
import { getPlantById } from "@/features/plants/api/plantsClient";

export function usePlant(plantId: string) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const careLogSinceLoggedAt = isPremium
    ? undefined
    : getFreeCareLogHistorySince();

  return useQuery({
    queryKey: [
      ...queryKeys.plant(plantId),
      careLogSinceLoggedAt ?? "full-history",
    ],
    enabled: Boolean(user?.id && plantId),
    queryFn: () =>
      getPlantById(user!.id, plantId, {
        careLogSinceLoggedAt,
      }),
  });
}

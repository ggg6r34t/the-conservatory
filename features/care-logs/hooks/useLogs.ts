import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";
import { getCareLogHistorySinceForDisplay } from "@/features/export/services/exportAccessPolicy";

export function useLogs(
  plantId: string,
  options?: { limit?: number; offset?: number },
) {
  const { isPremium } = useSubscription();
  const sinceLoggedAt = getCareLogHistorySinceForDisplay(isPremium, "display");

  return useQuery({
    queryKey: [
      ...queryKeys.careLogs(plantId),
      options?.limit,
      options?.offset,
      sinceLoggedAt ?? "all",
    ],
    enabled: Boolean(plantId),
    queryFn: () =>
      listCareLogs(plantId, {
        ...options,
        sinceLoggedAt,
      }),
  });
}

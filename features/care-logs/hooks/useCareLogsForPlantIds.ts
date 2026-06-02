import { useQuery } from "@tanstack/react-query";

import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";
import { getCareLogHistorySinceForDisplay } from "@/features/export/services/exportAccessPolicy";

export function careLogsBatchQueryKey(
  scope: string,
  plantIds: string[],
  sinceLoggedAt?: string,
) {
  return [
    "care-logs",
    "batch",
    scope,
    sinceLoggedAt ?? "all",
    [...plantIds].sort().join("|"),
  ] as const;
}

export function useCareLogsForPlantIds(
  plantIds: string[],
  scope: string,
  options?: { enabled?: boolean; isPremium?: boolean },
) {
  const stablePlantIds = [...new Set(plantIds.filter(Boolean))].sort();
  const sinceLoggedAt = getCareLogHistorySinceForDisplay(
    options?.isPremium ?? false,
    scope === "collection-streak" ? "streak" : "display",
  );

  return useQuery({
    queryKey: careLogsBatchQueryKey(scope, stablePlantIds, sinceLoggedAt),
    enabled: (options?.enabled ?? true) && stablePlantIds.length > 0,
    queryFn: () =>
      listCareLogsForPlants(stablePlantIds, { sinceLoggedAt }),
    placeholderData: (previousData) => previousData,
    staleTime: scope === "collection-streak" ? 1000 * 30 : 0,
  });
}

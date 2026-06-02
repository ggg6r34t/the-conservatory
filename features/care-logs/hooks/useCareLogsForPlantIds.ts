import { useQuery } from "@tanstack/react-query";

import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";

export function careLogsBatchQueryKey(scope: string, plantIds: string[]) {
  return ["care-logs", "batch", scope, plantIds.join("|")] as const;
}

export function useCareLogsForPlantIds(
  plantIds: string[],
  scope: string,
  enabled = true,
) {
  const stablePlantIds = plantIds.filter(Boolean);

  return useQuery({
    queryKey: careLogsBatchQueryKey(scope, stablePlantIds),
    enabled: enabled && stablePlantIds.length > 0,
    queryFn: () => listCareLogsForPlants(stablePlantIds),
  });
}

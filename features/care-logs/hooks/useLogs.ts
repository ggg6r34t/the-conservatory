import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";

export function useLogs(
  plantId: string,
  options?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [...queryKeys.careLogs(plantId), options?.limit, options?.offset],
    enabled: Boolean(plantId),
    queryFn: () => listCareLogs(plantId, options),
  });
}

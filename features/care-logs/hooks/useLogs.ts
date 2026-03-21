import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";

export function useLogs(plantId: string) {
  return useQuery({
    queryKey: queryKeys.careLogs(plantId),
    enabled: Boolean(plantId),
    queryFn: () => listCareLogs(plantId),
  });
}

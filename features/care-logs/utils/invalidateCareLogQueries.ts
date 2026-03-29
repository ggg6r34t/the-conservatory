import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";

export async function invalidateCareLogQueries(
  queryClient: QueryClient,
  plantId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["care-logs"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reminders }),
  ]);
}

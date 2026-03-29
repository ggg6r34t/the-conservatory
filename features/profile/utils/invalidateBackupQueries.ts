import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";

export async function invalidateBackupQueries(
  queryClient: QueryClient,
  userId: string | null | undefined,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["care-logs"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
    queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reminders }),
    queryClient.invalidateQueries({
      queryKey: ["profile-backup-summary", userId ?? "anonymous"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["profile-backup-availability", userId ?? "anonymous"],
    }),
  ]);
}

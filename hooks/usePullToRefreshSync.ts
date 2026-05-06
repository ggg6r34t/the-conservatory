import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkState } from "@/hooks/useNetworkState";
import { useSnackbar } from "@/hooks/useSnackbar";
import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";

export function usePullToRefreshSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { isOffline } = useNetworkState();
  const snackbar = useSnackbar();
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setLastSyncError(null);
    try {
      if (isAuthenticated && user?.id && !isOffline) {
        try {
          await bootstrapUserDataSync(user.id);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Cloud backup could not refresh right now.";
          setLastSyncError(message);
          snackbar.warning(
            "Local data refreshed, but cloud backup needs another retry.",
          );
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reminders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
        queryClient.invalidateQueries({ queryKey: ["care-logs"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isOffline, queryClient, refreshing, snackbar, user?.id]);

  return {
    lastSyncError,
    onRefresh,
    refreshing,
  };
}

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkState } from "@/hooks/useNetworkState";
import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";

export function usePullToRefreshSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { isOffline } = useNetworkState();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      if (isAuthenticated && user?.id && !isOffline) {
        await bootstrapUserDataSync(user.id);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reminders }),
        queryClient.invalidateQueries({ queryKey: ["care-logs"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isOffline, queryClient, refreshing, user?.id]);

  return {
    onRefresh,
    refreshing,
  };
}

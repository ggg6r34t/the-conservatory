import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkState } from "@/hooks/useNetworkState";
import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";
import { logger } from "@/utils/logger";

export function SyncBootstrapProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { isOffline } = useNetworkState();
  const isSyncingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      lastUserIdRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const runBootstrap = async (reason: "user" | "foreground") => {
      if (!isAuthenticated || !user?.id || isOffline || isSyncingRef.current) {
        return;
      }

      if (reason === "user" && lastUserIdRef.current === user.id) {
        return;
      }

      isSyncingRef.current = true;
      try {
        await bootstrapUserDataSync(user.id);
        lastUserIdRef.current = user.id;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
          queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        ]);
      } finally {
        isSyncingRef.current = false;
      }
    };

    runBootstrap("user").catch((error) => {
      logger.warn("sync.bootstrap.user_failed", {
        userId: user?.id ?? null,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    });

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          runBootstrap("foreground").catch((error) => {
            logger.warn("sync.bootstrap.foreground_failed", {
              userId: user?.id ?? null,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isOffline, queryClient, user?.id]);

  return children;
}

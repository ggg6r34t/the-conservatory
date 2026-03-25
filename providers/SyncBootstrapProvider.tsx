import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { queryKeys } from "@/config/constants";
import { waitForAuthPersistenceIdle } from "@/features/auth/api/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkState } from "@/hooks/useNetworkState";
import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";
import { logger } from "@/utils/logger";

export function SyncBootstrapProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, authStatus } = useAuth();
  const { isOffline } = useNetworkState();
  const isSyncingRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const attemptedUserBootstrapRef = useRef<string | null>(null);

  useEffect(() => {
    activeUserIdRef.current =
      authStatus === "authenticated" ? (user?.id ?? null) : null;
  }, [authStatus, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastUserIdRef.current = null;
      attemptedUserBootstrapRef.current = null;
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

      if (reason === "user" && attemptedUserBootstrapRef.current === user.id) {
        return;
      }

      if (reason === "user") {
        attemptedUserBootstrapRef.current = user.id;
        await waitForAuthPersistenceIdle(3000);
      }

      isSyncingRef.current = true;
      try {
        const activeUserId = user.id;
        await bootstrapUserDataSync(user.id);
        if (activeUserIdRef.current !== activeUserId) {
          return;
        }
        lastUserIdRef.current = user.id;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
          queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
          queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
        ]);
      } finally {
        isSyncingRef.current = false;
      }
    };

    const userBootstrapTimer = setTimeout(() => {
      runBootstrap("user").catch((error) => {
        logger.warn("sync.bootstrap.user_failed", {
          userId: user?.id ?? null,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });
    }, 1500);

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
      clearTimeout(userBootstrapTimer);
      subscription.remove();
    };
  }, [authStatus, isAuthenticated, isOffline, queryClient, user?.id]);

  return children;
}

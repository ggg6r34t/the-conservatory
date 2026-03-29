import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { waitForAuthPersistenceIdle } from "@/features/auth/api/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { invalidateBackupQueries } from "@/features/profile/utils/invalidateBackupQueries";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { useNetworkState } from "@/hooks/useNetworkState";
import { subscribeToSyncQueueChanges } from "@/services/database/syncSignals";
import { runUserDataSync, type UserDataSyncTrigger } from "@/services/database/userDataSync";
import { logger } from "@/utils/logger";

export function SyncBootstrapProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, authStatus } = useAuth();
  const { isOffline } = useNetworkState();
  const activeUserIdRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const attemptedUserBootstrapRef = useRef<string | null>(null);
  const lastOfflineRef = useRef(isOffline);

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
    const runAutoSync = async (
      reason: UserDataSyncTrigger,
      options?: { waitForAuth?: boolean; skipIfAlreadyBootstrapped?: boolean },
    ) => {
      if (!isAuthenticated || !user?.id || isOffline) {
        return;
      }

      if (
        options?.skipIfAlreadyBootstrapped &&
        lastUserIdRef.current === user.id
      ) {
        return;
      }

      if (
        options?.waitForAuth &&
        attemptedUserBootstrapRef.current === user.id
      ) {
        return;
      }

      if (options?.waitForAuth) {
        attemptedUserBootstrapRef.current = user.id;
        await waitForAuthPersistenceIdle(3000);
      }

      const preferences = await getUserPreferences(user.id);
      if (!preferences.autoSyncEnabled) {
        return;
      }

      try {
        const activeUserId = user.id;
        await runUserDataSync({
          userId: user.id,
          trigger: reason,
        });
        if (activeUserIdRef.current !== activeUserId) {
          return;
        }
        lastUserIdRef.current = user.id;
        await invalidateBackupQueries(queryClient, user.id).catch(
          () => undefined,
        );
      } catch (error) {
        logger.warn("sync.auto_trigger.failed", {
          userId: user.id,
          trigger: reason,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    const userBootstrapTimer = setTimeout(() => {
      runAutoSync("auto-bootstrap", {
        waitForAuth: true,
        skipIfAlreadyBootstrapped: true,
      }).catch(() => undefined);
    }, 1500);

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          runAutoSync("auto-foreground").catch(() => undefined);
        }
      },
    );

    const unsubscribeQueue = subscribeToSyncQueueChanges(() => {
      void runAutoSync("auto-queue").catch(() => undefined);
    });

    return () => {
      clearTimeout(userBootstrapTimer);
      subscription.remove();
      unsubscribeQueue();
    };
  }, [authStatus, isAuthenticated, isOffline, queryClient, user?.id]);

  useEffect(() => {
    if (!lastOfflineRef.current && isOffline) {
      lastOfflineRef.current = true;
      return;
    }

    if (lastOfflineRef.current && !isOffline && isAuthenticated && user?.id) {
      void (async () => {
        try {
          const preferences = await getUserPreferences(user.id);
          if (!preferences.autoSyncEnabled) {
            return;
          }

          await runUserDataSync({
            userId: user.id,
            trigger: "auto-network",
          });
          await invalidateBackupQueries(queryClient, user.id).catch(
            () => undefined,
          );
        } catch (error) {
          logger.warn("sync.auto_network.failed", {
            userId: user.id,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();
    }

    lastOfflineRef.current = isOffline;
  }, [isAuthenticated, isOffline, queryClient, user?.id]);

  return children;
}

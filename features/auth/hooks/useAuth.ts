import { useEffect, useMemo } from "react";

import {
  getInitialAuthUser,
  logout,
  requestPasswordReset,
  shouldResumePasswordRecovery,
} from "@/features/auth/api/authClient";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const beginRestore = useAuthStore((state) => state.beginRestore);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);
  const setUser = useAuthStore((state) => state.setUser);
  const resolveUser = useAuthStore((state) => state.resolveUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const transitionId = beginRestore();
    if (transitionId == null) {
      return;
    }

    getInitialAuthUser()
      .then(async (sessionUser) => {
        if (sessionUser) {
          resolveUser(sessionUser, transitionId);
          return;
        }

        if (await shouldResumePasswordRecovery()) {
          usePasswordRecoveryStore.getState().activate();
        }

        clearUser(transitionId);
      })
      .catch(() => clearUser(transitionId));
  }, [beginRestore, clearUser, resolveUser, status]);

  return useMemo(
    () => ({
      user,
      isReady: status !== "loading",
      isAuthenticated: status === "authenticated",
      isRestoring: status === "loading",
      isSigningOut: status === "signing_out",
      authStatus: status,
      requestPasswordReset,
      signOut: async () => {
        const transitionId = beginSignOut();
        clearUser(transitionId);
        try {
          await logout();
        } finally {
          clearUser(transitionId);
        }
      },
      setAuthenticatedUser: setUser,
    }),
    [beginSignOut, clearUser, setUser, status, user],
  );
}

import { useEffect, useMemo } from "react";

import {
  continueAsGuest,
  getInitialAuthUser,
  logout,
  requestPasswordReset,
  shouldResumePasswordRecovery,
} from "@/features/auth/api/authClient";
import { isGuestUser } from "@/features/auth/constants/guestUser";
import type { AuthMode } from "@/features/auth/types/authMode";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const beginRestore = useAuthStore((state) => state.beginRestore);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);
  const setUser = useAuthStore((state) => state.setUser);
  const setGuestUser = useAuthStore((state) => state.setGuestUser);
  const resolveUser = useAuthStore((state) => state.resolveUser);
  const resolveGuestUser = useAuthStore((state) => state.resolveGuestUser);
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
          if (isGuestUser(sessionUser)) {
            resolveGuestUser(sessionUser, transitionId);
            return;
          }

          resolveUser(sessionUser, transitionId);
          return;
        }

        if (await shouldResumePasswordRecovery()) {
          usePasswordRecoveryStore.getState().activate();
        }

        clearUser(transitionId);
      })
      .catch(() => clearUser(transitionId));
  }, [beginRestore, clearUser, resolveGuestUser, resolveUser, status]);

  return useMemo(
    () => ({
      user,
      isReady: status !== "loading",
      isAuthenticated: status === "authenticated",
      isGuest: status === "guest",
      authMode:
        status === "guest"
          ? ("guest" as AuthMode)
          : status === "authenticated"
            ? ("authenticated" as AuthMode)
            : null,
      hasAppAccess: status === "authenticated" || status === "guest",
      isRestoring: status === "loading",
      isSigningOut: status === "signing_out",
      authStatus: status,
      requestPasswordReset,
      continueAsGuest: async () => {
        const guestUser = await continueAsGuest();
        setGuestUser(guestUser);
        return guestUser;
      },
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
      setGuestUser,
    }),
    [beginSignOut, clearUser, setGuestUser, setUser, status, user],
  );
}

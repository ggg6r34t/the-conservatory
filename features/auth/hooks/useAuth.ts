import { useEffect, useMemo } from "react";

import {
  getInitialAuthUser,
  logout,
  requestPasswordReset,
} from "@/features/auth/api/authClient";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

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
      .then((sessionUser) => {
        if (sessionUser) {
          resolveUser(sessionUser, transitionId);
          return;
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

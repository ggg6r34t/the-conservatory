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
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    getInitialAuthUser()
      .then((sessionUser) => {
        if (sessionUser) {
          setUser(sessionUser);
          return;
        }

        clearUser();
      })
      .catch(() => clearUser());
  }, [clearUser, setUser, status]);

  return useMemo(
    () => ({
      user,
      isReady: status !== "loading",
      isAuthenticated: status === "authenticated",
      requestPasswordReset,
      signOut: async () => {
        await logout();
        clearUser();
      },
    }),
    [clearUser, status, user],
  );
}

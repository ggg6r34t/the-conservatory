import { type PropsWithChildren, useEffect } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  getBootstrapThemeId,
  readCachedThemeId,
  writeCachedThemeId,
} from "@/features/theme/services/themeCacheStorage";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";

export function ThemeBootstrapProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const setHydrated = useThemeRuntimeStore((state) => state.setHydrated);

  useEffect(() => {
    let cancelled = false;

    async function hydrateTheme() {
      const cachedThemeId = await readCachedThemeId();

      if (!isAuthenticated || !user?.id) {
        if (!cancelled) {
          setActiveThemeId(getBootstrapThemeId(cachedThemeId));
          setHydrated(true);
        }
        return;
      }

      try {
        const preferences = await getUserPreferences(user.id);
        const themeId = getBootstrapThemeId(
          cachedThemeId,
          preferences.preferredTheme,
        );
        await writeCachedThemeId(themeId);
        if (!cancelled) {
          setActiveThemeId(themeId);
          setHydrated(true);
        }
      } catch {
        if (!cancelled) {
          setActiveThemeId(getBootstrapThemeId(cachedThemeId));
          setHydrated(true);
        }
      }
    }

    void hydrateTheme();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setActiveThemeId, setHydrated, user?.id]);

  return children;
}

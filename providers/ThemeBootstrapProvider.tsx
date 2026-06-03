import { type PropsWithChildren, useEffect } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  readThemeSubscriptionSnapshot,
  resolveAccessibleThemeId,
  resolveBootstrapAccessibleTheme,
} from "@/features/theme/services/themeApplication";
import {
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
      const subscription = await readThemeSubscriptionSnapshot();
      const cachedThemeId = await readCachedThemeId();

      if (!isAuthenticated || !user?.id) {
        const themeId = resolveAccessibleThemeId(cachedThemeId, subscription);
        await writeCachedThemeId(themeId);
        if (!cancelled) {
          setActiveThemeId(themeId);
          setHydrated(true);
        }
        return;
      }

      try {
        const preferences = await getUserPreferences(user.id);
        const { themeId } = await resolveBootstrapAccessibleTheme({
          cachedThemeId,
          preferredTheme: preferences.preferredTheme,
          subscription,
          userId: user.id,
          source: "theme_bootstrap",
        });
        await writeCachedThemeId(themeId);
        if (!cancelled) {
          setActiveThemeId(themeId);
          setHydrated(true);
        }
      } catch {
        const themeId = resolveAccessibleThemeId(cachedThemeId, subscription);
        await writeCachedThemeId(themeId);
        if (!cancelled) {
          setActiveThemeId(themeId);
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

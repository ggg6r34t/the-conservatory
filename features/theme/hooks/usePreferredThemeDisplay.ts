import { useEffect, useMemo } from "react";

import { useSettings } from "@/features/settings/hooks/useSettings";
import { trackProfileThemeLabelRendered } from "@/features/theme/analytics";
import { formatThemeName } from "@/features/theme/registry";
import { resolveDisplayedPreferredThemeId } from "@/features/theme/services/displayPreferredTheme";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";

export { resolveDisplayedPreferredThemeId } from "@/features/theme/services/displayPreferredTheme";

export function usePreferredThemeDisplayName(source = "profile_settings") {
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const hydrated = useThemeRuntimeStore((state) => state.hydrated);
  const settingsQuery = useSettings();

  const themeId = useMemo(
    () =>
      resolveDisplayedPreferredThemeId({
        activeThemeId,
        hydrated,
        persistedThemeId: settingsQuery.data?.preferredTheme,
      }),
    [activeThemeId, hydrated, settingsQuery.data?.preferredTheme],
  );

  const displayName = useMemo(() => formatThemeName(themeId), [themeId]);

  useEffect(() => {
    trackProfileThemeLabelRendered({ theme_id: themeId, source });
  }, [source, themeId]);

  return {
    themeId,
    displayName,
    isLoading: settingsQuery.isLoading && !settingsQuery.data,
  };
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updatePreferredTheme } from "@/features/settings/api/settingsClient";
import {
  trackThemeChanged,
  trackThemeSelected,
} from "@/features/theme/analytics";
import { useSettingsStore } from "@/features/settings/stores/useSettingsStore";
import { writeCachedThemeId } from "@/features/theme/services/themeCacheStorage";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import type { ThemeId } from "@/features/theme/types";

export function usePreferredThemeMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const setSettingsStoreTheme = useSettingsStore((state) => state.setTheme);

  return useMutation({
    mutationFn: async (nextThemeId: ThemeId) => {
      if (!user?.id) {
        throw new Error("A signed-in user is required.");
      }

      const previousTheme = activeThemeId;
      if (previousTheme === nextThemeId) {
        return { previousTheme, nextThemeId, changed: false };
      }

      await updatePreferredTheme(user.id, nextThemeId);
      await writeCachedThemeId(nextThemeId);
      setActiveThemeId(nextThemeId);
      setSettingsStoreTheme(nextThemeId);

      trackThemeSelected({
        theme_id: nextThemeId,
        previous_theme: previousTheme,
        new_theme: nextThemeId,
      });
      trackThemeChanged({
        theme_id: nextThemeId,
        previous_theme: previousTheme,
        new_theme: nextThemeId,
      });

      return { previousTheme, nextThemeId, changed: true };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.preferences,
      });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { useSettingsStore } from "@/features/settings/stores/useSettingsStore";
import {
  trackPremiumThemeUnlocked,
} from "@/features/theme/analytics";
import {
  applyTheme,
  ThemeApplicationError,
} from "@/features/theme/services/themeApplication";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import { getThemeAccess } from "@/features/theme/themeAccess";
import type { ThemeId } from "@/features/theme/types";

export function usePreferredThemeMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const setSettingsStoreTheme = useSettingsStore((state) => state.setTheme);
  const tier = useBillingStore((state) => state.tier);
  const period = useBillingStore((state) => state.period);

  return useMutation({
    mutationFn: async (nextThemeId: ThemeId) => {
      if (!user?.id) {
        throw new Error("A signed-in user is required.");
      }

      const subscription = { tier, period };
      const result = await applyTheme({
        userId: user.id,
        themeId: nextThemeId,
        subscription,
        previousThemeId: activeThemeId,
        source: "theme_screen",
      });

      if (result.changed) {
        setActiveThemeId(result.appliedThemeId);
        setSettingsStoreTheme(result.appliedThemeId);

        if (getThemeAccess(result.appliedThemeId) === "premium") {
          trackPremiumThemeUnlocked({
            theme_id: result.appliedThemeId,
            previous_theme_id: result.previousThemeId,
            subscription_tier: tier,
            source: "theme_screen",
          });
        }
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.preferences,
      });
    },
  });
}

export { ThemeApplicationError };

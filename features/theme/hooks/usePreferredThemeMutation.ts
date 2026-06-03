import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { useSettingsStore } from "@/features/settings/stores/useSettingsStore";
import type { UserPreferences } from "@/types/models";
import { trackPremiumThemeUnlocked } from "@/features/theme/analytics";
import {
  applyTheme,
  ThemeApplicationError,
} from "@/features/theme/services/themeApplication";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import { getThemeAccess } from "@/features/theme/themeAccess";
import type { ThemeId } from "@/features/theme/types";

export type PreferredThemeMutationInput = {
  themeId: ThemeId;
  previousThemeId: ThemeId;
};

export function usePreferredThemeMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const setSettingsStoreTheme = useSettingsStore((state) => state.setTheme);
  const tier = useBillingStore((state) => state.tier);
  const period = useBillingStore((state) => state.period);

  return useMutation({
    mutationFn: async (input: PreferredThemeMutationInput) => {
      if (!user?.id) {
        throw new Error("A signed-in user is required.");
      }

      const subscription = { tier, period };
      const result = await applyTheme({
        userId: user.id,
        themeId: input.themeId,
        subscription,
        previousThemeId: input.previousThemeId,
        source: "theme_screen",
      });

      setActiveThemeId(result.appliedThemeId);
      setSettingsStoreTheme(result.appliedThemeId);

      if (result.changed && getThemeAccess(result.appliedThemeId) === "premium") {
        trackPremiumThemeUnlocked({
          theme_id: result.appliedThemeId,
          previous_theme_id: result.previousThemeId,
          subscription_tier: tier,
          source: "theme_screen",
        });
      }

      return result;
    },
    onSuccess: async (result) => {
      if (!user?.id) {
        return;
      }

      const queryKey = [...queryKeys.preferences, user.id] as const;
      queryClient.setQueryData<UserPreferences | undefined>(queryKey, (current) =>
        current
          ? {
              ...current,
              preferredTheme: result.appliedThemeId,
            }
          : current,
      );

      await queryClient.invalidateQueries({
        queryKey: queryKeys.preferences,
      });
    },
  });
}

export { ThemeApplicationError };

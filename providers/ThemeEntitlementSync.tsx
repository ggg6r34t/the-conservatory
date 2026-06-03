import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { useSettingsStore } from "@/features/settings/stores/useSettingsStore";
import { DEFAULT_THEME_ID } from "@/features/theme/registry";
import {
  revertToDefaultTheme,
} from "@/features/theme/services/themeApplication";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import {
  canUseTheme,
  isPremiumTheme,
} from "@/features/theme/themeAccess";
import { useSnackbar } from "@/hooks/useSnackbar";

export function ThemeEntitlementSync({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const tier = useBillingStore((state) => state.tier);
  const period = useBillingStore((state) => state.period);
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const setSettingsStoreTheme = useSettingsStore((state) => state.setTheme);
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const previousKeyRef = useRef<string | null>(null);
  const isRevertingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || isRevertingRef.current) {
      return;
    }

    const snapshot = { tier, period };
    const snapshotKey = `${tier}:${period ?? "none"}`;
    const access = canUseTheme(activeThemeId, snapshot);
    const shouldRevert =
      isPremiumTheme(activeThemeId) && !access.canUse;

    if (previousKeyRef.current === null) {
      previousKeyRef.current = snapshotKey;
      if (shouldRevert) {
        void revertActiveTheme(user.id, activeThemeId);
      }
      return;
    }

    if (previousKeyRef.current === snapshotKey) {
      return;
    }

    previousKeyRef.current = snapshotKey;

    if (shouldRevert) {
      void revertActiveTheme(user.id, activeThemeId);
    }
  }, [
    activeThemeId,
    isAuthenticated,
    period,
    tier,
    user?.id,
  ]);

  async function revertActiveTheme(
    userId: string,
    previousThemeId: typeof activeThemeId,
  ) {
    if (previousThemeId === DEFAULT_THEME_ID) {
      return;
    }

    isRevertingRef.current = true;
    try {
      const themeId = await revertToDefaultTheme({
        userId,
        previousThemeId,
        source: "entitlement_downgrade",
      });
      setActiveThemeId(themeId);
      setSettingsStoreTheme(themeId);
      snackbar.info(
        "Your theme has returned to Linen Light. Premium themes require an active subscription.",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
    } finally {
      isRevertingRef.current = false;
    }
  }

  return children;
}

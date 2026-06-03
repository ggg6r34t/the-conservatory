import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  trackPremiumThemeBlocked,
  trackPremiumThemeTapped,
  trackThemeScreenViewed,
} from "@/features/theme/analytics";
import {
  announceThemeSelection,
  ThemeSelectionCard,
} from "@/features/theme/components/ThemeSelectionCard";
import {
  ThemeApplicationError,
  usePreferredThemeMutation,
} from "@/features/theme/hooks/usePreferredThemeMutation";
import { resolveThemeId, themeCatalog } from "@/features/theme/registry";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import {
  canUseTheme,
  getThemeAccess,
} from "@/features/theme/themeAccess";
import type { ThemeId } from "@/features/theme/types";

export function InterfaceThemePicker() {
  const router = useRouter();
  const { colors } = useTheme();
  const settingsQuery = useSettings();
  const { tier, period } = useSubscription();
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const preferredThemeMutation = usePreferredThemeMutation();
  const persistedThemeId = resolveThemeId(settingsQuery.data?.preferredTheme);
  const [pendingThemeId, setPendingThemeId] = useState<ThemeId | null>(null);

  const selectedThemeId = pendingThemeId ?? activeThemeId ?? persistedThemeId;
  const catalog = useMemo(() => themeCatalog, []);
  const subscription = useMemo(() => ({ tier, period }), [tier, period]);

  useEffect(() => {
    trackThemeScreenViewed({ theme_id: selectedThemeId, source: "theme_screen" });
  }, [selectedThemeId]);

  const handleSelect = useCallback(
    async (themeId: ThemeId) => {
      if (themeId === selectedThemeId) {
        return;
      }

      const access = canUseTheme(themeId, subscription);

      if (!access.canUse) {
        trackPremiumThemeTapped({
          theme_id: themeId,
          previous_theme_id: selectedThemeId,
          source: "theme_screen",
        });
        trackPremiumThemeBlocked({
          theme_id: themeId,
          previous_theme_id: selectedThemeId,
          reason: access.reason,
          source: "theme_screen",
        });
        router.push({
          pathname: "/premium",
          params: { source: "theme_screen", theme_id: themeId },
        });
        return;
      }

      const previousThemeId = selectedThemeId;
      setPendingThemeId(themeId);
      setActiveThemeId(themeId);
      try {
        await preferredThemeMutation.mutateAsync(themeId);
        const themeName = themeCatalog.find((theme) => theme.id === themeId)?.name;
        if (themeName) {
          await announceThemeSelection(themeName);
        }
      } catch (error) {
        setActiveThemeId(previousThemeId);
        if (error instanceof ThemeApplicationError) {
          trackPremiumThemeBlocked({
            theme_id: themeId,
            previous_theme_id: previousThemeId,
            reason: error.code,
            source: "theme_screen",
          });
          router.push({
            pathname: "/premium",
            params: { source: "theme_screen", theme_id: themeId },
          });
        }
      } finally {
        setPendingThemeId(null);
      }
    },
    [
      preferredThemeMutation,
      router,
      selectedThemeId,
      setActiveThemeId,
      subscription,
    ],
  );

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {catalog.map((theme) => {
        const locked =
          getThemeAccess(theme.id) === "premium" &&
          !canUseTheme(theme.id, subscription).canUse;

        return (
          <ThemeSelectionCard
            key={theme.id}
            theme={theme}
            selected={selectedThemeId === theme.id}
            locked={locked}
            disabled={preferredThemeMutation.isPending}
            onSelect={handleSelect}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 32,
  },
  loading: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
});

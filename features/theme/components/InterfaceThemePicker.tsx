import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { trackThemeScreenViewed } from "@/features/theme/analytics";
import {
  announceThemeSelection,
  ThemeSelectionCard,
} from "@/features/theme/components/ThemeSelectionCard";
import { usePreferredThemeMutation } from "@/features/theme/hooks/usePreferredThemeMutation";
import { resolveThemeId, themeCatalog } from "@/features/theme/registry";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import type { ThemeId } from "@/features/theme/types";

export function InterfaceThemePicker() {
  const { colors } = useTheme();
  const settingsQuery = useSettings();
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const setActiveThemeId = useThemeRuntimeStore((state) => state.setActiveThemeId);
  const preferredThemeMutation = usePreferredThemeMutation();
  const persistedThemeId = resolveThemeId(settingsQuery.data?.preferredTheme);
  const [pendingThemeId, setPendingThemeId] = useState<ThemeId | null>(null);

  const selectedThemeId = pendingThemeId ?? activeThemeId ?? persistedThemeId;
  const catalog = useMemo(() => themeCatalog, []);

  useEffect(() => {
    trackThemeScreenViewed({ theme_id: selectedThemeId });
  }, [selectedThemeId]);

  const handleSelect = useCallback(
    async (themeId: ThemeId) => {
      if (themeId === selectedThemeId) {
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
      } catch {
        setActiveThemeId(previousThemeId);
      } finally {
        setPendingThemeId(null);
      }
    },
    [preferredThemeMutation, selectedThemeId, setActiveThemeId],
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
      {catalog.map((theme) => (
        <ThemeSelectionCard
          key={theme.id}
          theme={theme}
          selected={selectedThemeId === theme.id}
          disabled={preferredThemeMutation.isPending}
          onSelect={handleSelect}
        />
      ))}
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

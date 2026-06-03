import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemePreviewRenderer } from "@/features/theme/components/ThemePreviewRenderer";
import { ThemeSelectionIndicator } from "@/features/theme/components/ThemeSelectionIndicator";
import { trackThemePreviewViewed } from "@/features/theme/analytics";
import type { ThemeDefinition } from "@/features/theme/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ThemeSelectionCardProps {
  theme: ThemeDefinition;
  selected: boolean;
  disabled?: boolean;
  onSelect: (themeId: ThemeDefinition["id"]) => void;
  style?: ViewStyle;
}

export const ThemeSelectionCard = memo(function ThemeSelectionCard({
  theme,
  selected,
  disabled = false,
  onSelect,
  style,
}: ThemeSelectionCardProps) {
  const cardScale = useSharedValue(selected ? 1 : 0.995);

  useEffect(() => {
    cardScale.value = withSpring(selected ? 1 : 0.995, {
      damping: 18,
      stiffness: 220,
    });
  }, [cardScale, selected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePress = useCallback(() => {
    if (selected || disabled) {
      return;
    }

    void Haptics.selectionAsync();
    trackThemePreviewViewed({ theme_id: theme.id });
    onSelect(theme.id);
  }, [disabled, onSelect, selected, theme.id]);

  const accessibilityHint = selected
    ? "Currently selected theme"
    : "Double tap to apply theme";

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${theme.name}. ${theme.description}`}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.card,
        animatedCardStyle,
        {
          backgroundColor: theme.card.background,
          borderColor: selected ? theme.card.selectionRing : "transparent",
          borderWidth: selected ? 2 : 0,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.card.title }]}>
            {theme.name}
          </Text>
          <Text style={[styles.description, { color: theme.card.description }]}>
            {theme.description}
          </Text>
        </View>
        <ThemeSelectionIndicator selected={selected} theme={theme} />
      </View>

      <ThemePreviewRenderer theme={theme} />

      <View
        style={[
          styles.editorialSection,
          { borderTopColor: theme.card.editorialDivider },
        ]}
      >
        <Text
          style={[styles.editorialLabel, { color: theme.card.editorialLabel }]}
        >
          EDITORIAL PREVIEW
        </Text>
        <Text
          style={[styles.editorialQuote, { color: theme.card.editorialQuote }]}
        >
          "{theme.quote}"
        </Text>
      </View>
    </AnimatedPressable>
  );
});

export async function announceThemeSelection(themeName: string) {
  await AccessibilityInfo.announceForAccessibility(
    `${themeName} theme selected`,
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  editorialSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    gap: 8,
  },
  editorialLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
  },
  editorialQuote: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 14,
    lineHeight: 22,
  },
});

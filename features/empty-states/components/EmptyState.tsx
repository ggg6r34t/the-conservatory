import { useEffect } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { Href } from "expo-router";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { trackEmptyStateViewed } from "@/features/empty-states/analytics";
import type { EmptyStateContent } from "@/features/empty-states/types";

type EmptyStateProps = {
  content: EmptyStateContent;
  screen: string;
  reason: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryHref?: Href;
  style?: ViewStyle;
  testID?: string;
};

export function EmptyState({
  content,
  screen,
  reason,
  onPrimaryAction,
  onSecondaryAction,
  primaryHref,
  style,
  testID,
}: EmptyStateProps) {
  const { colors } = useTheme();

  useEffect(() => {
    trackEmptyStateViewed({
      screen,
      empty_state_type: content.tone,
      reason,
      analytics_key: content.analyticsKey,
    });
  }, [content.analyticsKey, content.tone, reason, screen]);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: colors.surfaceContainerLow },
        style,
      ]}
      accessibilityRole="text"
      accessible
      accessibilityLabel={`${content.title}. ${content.body}`}
    >
      <Text
        style={[styles.title, { color: colors.primary }]}
        accessibilityRole="header"
      >
        {content.title}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {content.body}
      </Text>
      {content.primaryActionLabel ? (
        <PrimaryButton
          label={content.primaryActionLabel}
          href={primaryHref}
          onPress={onPrimaryAction}
        />
      ) : null}
      {content.secondaryActionLabel && onSecondaryAction ? (
        <PrimaryButton
          compact
          label={content.secondaryActionLabel}
          onPress={onSecondaryAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
});

import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { SpeciesSuggestion } from "@/features/ai/types/ai";

interface SpeciesSuggestionBannerProps {
  suggestion: SpeciesSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

export function SpeciesSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: SpeciesSuggestionBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: "rgba(193, 200, 194, 0.25)",
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        QUIET SUGGESTION
      </Text>
      <Text style={[styles.title, { color: colors.onSurface }]}>
        Likely {suggestion.species}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {suggestion.careProfileHint ??
          `Confidence ${Math.round(suggestion.confidence * 100)}%. Use it as a starting point only.`}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onAccept}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>
            USE SUGGESTION
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={[styles.actionLabel, { color: colors.onSurfaceVariant }]}>
            NOT NOW
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 2,
  },
  actionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
  },
});

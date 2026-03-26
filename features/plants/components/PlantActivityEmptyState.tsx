import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

export function PlantActivityEmptyState() {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          gap: spacing.sm,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.onSurface }]}>
        No care history yet
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        This chronicle begins with the first saved watering, observation, or
        care ritual for this specimen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 24,
  },
});

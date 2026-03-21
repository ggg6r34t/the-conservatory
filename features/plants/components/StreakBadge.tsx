import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
    >
      <Text style={[styles.count, { color: colors.primary }]}>{streak}</Text>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
        ACTIVE STREAK
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  count: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
});

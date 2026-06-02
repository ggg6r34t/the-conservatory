import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface StreakBadgeProps {
  streak: number;
  variant?: "default" | "compact";
}

export function StreakBadge({ streak, variant = "default" }: StreakBadgeProps) {
  const { colors } = useTheme();
  const compact = variant === "compact";

  return (
    <View
      style={[
        compact ? styles.compactContainer : styles.container,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${streak} day streak`}
    >
      <Text
        style={[
          compact ? styles.compactCount : styles.count,
          { color: colors.primary },
        ]}
      >
        {streak}
      </Text>
      <Text
        style={[
          compact ? styles.compactLabel : styles.label,
          { color: colors.onSurfaceVariant },
        ]}
      >
        {compact ? "DAYS STREAK" : "ACTIVE STREAK"}
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
  compactContainer: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  count: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
  },
  compactCount: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
  compactLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
  },
});

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface StreakBadgeProps {
  streak: number;
  variant?: "default" | "compact";
  totalPlants?: number;
}

export function StreakBadge({
  streak,
  variant = "default",
  totalPlants,
}: StreakBadgeProps) {
  const { colors } = useTheme();
  const compact = variant === "compact";
  const hasCollection = (totalPlants ?? 1) > 0;
  const streakLabel = compact ? "DAYS STREAK" : "ACTIVE STREAK";
  const zeroCopy = hasCollection
    ? "0 day streak"
    : "Care rhythm begins with your first log";

  return (
    <View
      style={
        compact
          ? styles.compactContainer
          : [styles.container, { backgroundColor: colors.surfaceContainerLow }]
      }
      accessibilityRole="text"
      accessibilityLabel={hasCollection ? `${streak} day streak` : zeroCopy}
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
        {hasCollection ? streakLabel : "BEGIN CARE RHYTHM"}
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

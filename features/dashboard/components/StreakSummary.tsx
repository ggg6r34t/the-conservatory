import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface StreakSummaryProps {
  activePlants: number;
  dueToday: number;
}

export function StreakSummary({ activePlants, dueToday }: StreakSummaryProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.metric}>
        <Text style={styles.count}>{activePlants}</Text>
        <Text style={styles.label}>ACTIVE SPECIES</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.count}>{dueToday}</Text>
        <Text style={styles.label}>DUE TODAY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    gap: 6,
  },
  count: {
    color: "#ffffff",
    fontFamily: "NotoSerif_700Bold",
    fontSize: 30,
  },
  label: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
});

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { getInsightSourceLabel } from "@/features/ai/services/insightSourcePresentation";
import type { JournalMonthlySummary } from "@/features/ai/types/ai";

export function JournalSummaryCard({
  summary,
}: {
  summary: JournalMonthlySummary;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        MONTHLY REFLECTION
      </Text>
      <Text style={[styles.title, { color: colors.primary }]}>
        {summary.title}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {summary.body}
      </Text>
      <Text style={[styles.source, { color: colors.onSurfaceVariant }]}>
        {getInsightSourceLabel(summary.source)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 15,
    lineHeight: 24,
  },
  source: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});

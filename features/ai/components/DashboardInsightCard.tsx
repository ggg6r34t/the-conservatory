import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { DashboardInsight } from "@/features/ai/types/ai";

export function DashboardInsightCard({
  insight,
}: {
  insight: DashboardInsight;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View style={styles.header}>
        <Icon
          family="MaterialCommunityIcons"
          name="leaf-circle-outline"
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {insight.title}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {insight.body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
});

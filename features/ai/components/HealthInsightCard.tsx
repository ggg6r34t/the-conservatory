import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { HealthInsight } from "@/features/ai/types/ai";

export function HealthInsightCard({ insight }: { insight: HealthInsight }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.header}>
        <Icon
          family="MaterialCommunityIcons"
          name="leaf-maple"
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
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 21,
  },
});

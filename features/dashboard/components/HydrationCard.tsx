import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface HydrationCardProps {
  dueToday: number;
}

export function HydrationCard({ dueToday }: HydrationCardProps) {
  const { colors } = useTheme();

  const statusCopy =
    dueToday === 0
      ? "All specimens are comfortably hydrated."
      : "All specimens are within safe moisture levels.";
  const cycleCopy =
    dueToday === 0
      ? "Next cycle begins tomorrow."
      : `Next cycle in ${Math.max(1, dueToday)}${
          dueToday === 1 ? " hour" : " hours"
        }.`;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon
            family="MaterialIcons"
            color={colors.primary}
            name="water-drop"
            size={18}
          />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          Hydration
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {statusCopy}
      </Text>
      <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
        {cycleCopy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    minHeight: 114,
    paddingHorizontal: 22,
    paddingVertical: 26,
    gap: 10,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    marginTop: 1,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});

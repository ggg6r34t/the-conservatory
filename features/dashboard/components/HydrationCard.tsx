import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getHydrationCardCopy } from "@/features/empty-states/getEmptyStateForContext";

interface HydrationCardProps {
  totalPlants: number;
  dueToday: number;
  overdue: number;
  nextCycleHours: number | null;
}

export function HydrationCard({
  totalPlants,
  dueToday,
  overdue,
  nextCycleHours,
}: HydrationCardProps) {
  const { colors } = useTheme();
  const { statusCopy, cycleCopy } = getHydrationCardCopy({
    totalPlants,
    dueToday,
    overdue,
    nextCycleHours,
  });

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
      <View>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          {statusCopy}
        </Text>
        {cycleCopy ? (
          <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
            {cycleCopy}
          </Text>
        ) : null}
      </View>
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
    fontSize: 14,
    lineHeight: 22,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});

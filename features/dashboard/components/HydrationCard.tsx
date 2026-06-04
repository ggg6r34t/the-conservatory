import { Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getHydrationCardCopy } from "@/features/empty-states/getEmptyStateForContext";
import { dashboardUtilityCardStyles } from "@/styles/dashboardEntryCards";

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
      style={[
        dashboardUtilityCardStyles.card,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
    >
      <View style={dashboardUtilityCardStyles.header}>
        <View style={dashboardUtilityCardStyles.iconWrap}>
          <Icon
            family="MaterialIcons"
            color={colors.primary}
            name="water-drop"
            size={18}
          />
        </View>
        <Text style={[dashboardUtilityCardStyles.title, { color: colors.onSurface }]}>
          Hydration
        </Text>
      </View>
      <View>
        <Text style={[dashboardUtilityCardStyles.body, { color: colors.onSurfaceVariant }]}>
          {statusCopy}
        </Text>
        {cycleCopy ? (
          <Text style={[dashboardUtilityCardStyles.meta, { color: colors.onSurfaceVariant }]}>
            {cycleCopy}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

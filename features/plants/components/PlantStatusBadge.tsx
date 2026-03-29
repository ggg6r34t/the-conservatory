import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getPlantStatusBadgePresentation } from "@/features/plants/services/plantStatusBadgePresentation";
import type { PlantHealthState } from "@/features/plants/services/plantStatusService";

type PlantStatusBadgeVariant = "detail" | "compact";

interface PlantStatusBadgeProps {
  healthState: PlantHealthState;
  variant?: PlantStatusBadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function PlantStatusBadge({
  healthState,
  variant = "compact",
  style,
}: PlantStatusBadgeProps) {
  const { colors } = useTheme();
  const presentation = getPlantStatusBadgePresentation({ healthState, colors });

  if (variant === "detail") {
    return (
      <View
        style={[
          styles.detailCard,
          { backgroundColor: colors.surfaceContainerLowest },
          style,
        ]}
      >
        <View
          style={[
            styles.detailIconWrap,
            { backgroundColor: presentation.iconBackgroundColor },
          ]}
        >
          <Icon
            name={presentation.icon}
            size={13}
            color={presentation.iconColor}
          />
        </View>
        <View style={styles.detailCopy}>
          <Text style={[styles.detailEyebrow, { color: colors.onSurfaceVariant }]}>
            STATUS
          </Text>
          <Text style={[styles.detailValue, { color: presentation.labelColor }]}>
            {presentation.label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.compactCard,
        { backgroundColor: colors.surfaceContainerLowest },
        style,
      ]}
    >
      <View
        style={[
          styles.compactIconWrap,
          { backgroundColor: presentation.iconBackgroundColor },
        ]}
      >
        <Icon
          name={presentation.icon}
          size={11}
          color={presentation.iconColor}
        />
      </View>
      <Text style={[styles.compactLabel, { color: presentation.labelColor }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: {
    gap: 0,
  },
  detailEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  detailValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  compactCard: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  compactLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.1,
  },
});

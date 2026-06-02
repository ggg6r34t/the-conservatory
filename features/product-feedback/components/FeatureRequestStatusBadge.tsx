import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getFeatureRequestStatusPresentation } from "@/features/product-feedback/services/featureRequestStatusPresentation";
import type { FeatureRequestStatus } from "@/features/product-feedback/constants";

type FeatureRequestStatusBadgeProps = {
  status: FeatureRequestStatus;
};

export function FeatureRequestStatusBadge({
  status,
}: FeatureRequestStatusBadgeProps) {
  const { colors } = useTheme();
  const presentation = getFeatureRequestStatusPresentation(status);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={presentation.accessibilityLabel}
      style={[
        styles.badge,
        { backgroundColor: colors.surfaceContainerHigh },
      ]}
    >
      <Icon
        family="MaterialCommunityIcons"
        name={presentation.icon}
        size={16}
        color={colors[presentation.colorToken]}
      />
      <Text style={[styles.label, { color: colors[presentation.colorToken] }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

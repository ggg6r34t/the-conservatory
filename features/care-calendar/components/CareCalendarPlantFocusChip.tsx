import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface CareCalendarPlantFocusChipProps {
  plantName: string;
  onClear: () => void;
}

export function CareCalendarPlantFocusChip({
  plantName,
  onClear,
}: CareCalendarPlantFocusChipProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
        Viewing
      </Text>
      <Text style={[styles.name, { color: colors.primary }]} numberOfLines={1}>
        {plantName}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show all plants on calendar"
        onPress={onClear}
        hitSlop={8}
      >
        <Icon
          family="MaterialCommunityIcons"
          name="close-circle"
          size={20}
          color={colors.secondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  name: {
    flex: 1,
    fontFamily: "NotoSerif_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
});

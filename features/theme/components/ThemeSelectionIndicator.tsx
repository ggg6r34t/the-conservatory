import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icon } from "@/components/common/Icon/Icon";
import type { ThemeDefinition } from "@/features/theme/types";

interface ThemeSelectionIndicatorProps {
  selected: boolean;
  theme: ThemeDefinition;
}

export const ThemeSelectionIndicator = memo(function ThemeSelectionIndicator({
  selected,
  theme,
}: ThemeSelectionIndicatorProps) {
  const scale = useSharedValue(selected ? 1 : 0.92);

  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0.92, {
      damping: 16,
      stiffness: 220,
    });
  }, [scale, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (selected) {
    return (
      <Animated.View
        style={[
          styles.selected,
          animatedStyle,
          {
            backgroundColor: theme.card.selectionFill,
          },
        ]}
      >
        <Icon name="check" size={16} color={theme.card.selectionIcon} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.unselected,
        animatedStyle,
        {
          borderColor: theme.card.unselectedRing,
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  selected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  unselected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
});

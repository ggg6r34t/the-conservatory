import { StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface WalkthroughProgressProps {
  count: number;
  activeIndex: number;
}

export function WalkthroughProgress({
  count,
  activeIndex,
}: WalkthroughProgressProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: activeIndex + 1 }}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive && styles.activeDot,
              {
                backgroundColor: isActive ? colors.primary : "#d9ddd7",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  activeDot: {
    width: 32,
    height: 10,
  },
});

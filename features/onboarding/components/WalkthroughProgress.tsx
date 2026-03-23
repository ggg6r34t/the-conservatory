import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface WalkthroughProgressProps {
  count: number;
  activeIndex: number;
}

const DOT_SIZE = 10;
const ACTIVE_DOT_WIDTH = 32;
const DOT_GAP = 12;

export function WalkthroughProgress({
  count,
  activeIndex,
}: WalkthroughProgressProps) {
  const { colors } = useTheme();
  const progressValues = useRef<Animated.Value[]>([]);

  const animatedDots = useMemo(() => {
    if (progressValues.current.length !== count) {
      progressValues.current = Array.from({ length: count }, (_, index) => {
        const initialValue = index === activeIndex ? 1 : 0;
        return progressValues.current[index] ?? new Animated.Value(initialValue);
      });
    }

    return progressValues.current;
  }, [activeIndex, count]);

  useEffect(() => {
    const animations = animatedDots.map((value, index) =>
      Animated.timing(value, {
        toValue: index === activeIndex ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    );

    Animated.parallel(animations).start();
  }, [activeIndex, animatedDots]);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: activeIndex + 1 }}
    >
      {animatedDots.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: value.interpolate({
                inputRange: [0, 1],
                outputRange: [DOT_SIZE, ACTIVE_DOT_WIDTH],
              }),
              backgroundColor: value.interpolate({
                inputRange: [0, 1],
                outputRange: ["#d9ddd7", colors.primary],
              }),
              transform: [
                {
                  scaleX: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 999,
  },
});

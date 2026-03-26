import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale, shadowWithColor } from "@/styles/shadows";

const tabTitles: Record<string, string> = {
  index: "Garden",
  library: "Discovery",
  journal: "Journal",
  graveyard: "Graveyard",
};

const tabIcons: Record<
  string,
  string
> = {
  index: "sprout",
  library: "magnify",
  journal: "book-open-variant-outline",
  graveyard: "skull-outline",
};

function ConservatoryTabBarItem({
  isFocused,
  label,
  iconName,
  onPress,
}: {
  isFocused: boolean;
  label: string;
  iconName: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const focusProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focusProgress, isFocused]);

  const iconTranslateY = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, 0],
  });

  const iconOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, 1],
  });

  const labelOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  const labelTranslateY = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const activeBackgroundOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
      ]}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          isFocused && [styles.iconWrapActive, shadowScale.subtleSurface],
          {
            opacity: iconOpacity,
            transform: [{ translateY: iconTranslateY }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.iconActiveBackground,
            {
              backgroundColor: colors.surfaceContainerHigh,
              opacity: activeBackgroundOpacity,
            },
          ]}
        />
        <Icon
          color={isFocused ? colors.primary : colors.outline}
          name={iconName}
          size={20}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            color: isFocused ? colors.onSurface : colors.outline,
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslateY }],
          },
        ]}
      >
        {label.toUpperCase()}
      </Animated.Text>
    </Pressable>
  );
}

export function ConservatoryTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => route.name in tabTitles);

  return (
    <View
      style={[styles.wrapper, { backgroundColor: "rgba(255, 255, 255, 0.96)" }]}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={48}
        tint="light"
        style={[
          styles.blur,
          {
            backgroundColor: "transparent",
            shadowColor: colors.backdrop,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.row}>
          {visibleRoutes.map((route) => {
            const routeIndex = state.routes.findIndex(
              (entry) => entry.key === route.key,
            );
            const isFocused = state.index === routeIndex;
            const iconName = tabIcons[route.name];
            const label = tabTitles[route.name] ?? route.name;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <ConservatoryTabBarItem
                key={route.key}
                isFocused={isFocused}
                label={label}
                iconName={iconName}
                onPress={onPress}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  blur: {
    paddingHorizontal: 16,
    paddingTop: 10,
    minHeight: 72,
    ...shadowWithColor(shadowScale.elevatedCard),
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
  },
  itemPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconWrapActive: {
    borderRadius: 12,
    overflow: "hidden",
  },
  iconActiveBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
});

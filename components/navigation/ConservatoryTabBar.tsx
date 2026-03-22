import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

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
              <Pressable
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                key={route.key}
                onPress={onPress}
                style={styles.item}
              >
                <View
                  style={[
                    styles.iconWrap,
                    isFocused && [
                      styles.iconWrapActive,
                      { backgroundColor: colors.surfaceContainerHigh },
                    ],
                  ]}
                >
                  <Icon
                    color={isFocused ? colors.primary : colors.outline}
                    name={iconName}
                    size={20}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? colors.onSurface : colors.outline },
                  ]}
                >
                  {label.toUpperCase()}
                </Text>
              </Pressable>
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 0,
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
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    borderRadius: 12,
    overflow: "hidden",
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
});

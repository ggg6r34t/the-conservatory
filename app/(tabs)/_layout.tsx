import { Tabs } from "expo-router";
import React from "react";
import { Easing } from "react-native";

import { ConservatoryTabBar } from "@/components/navigation/ConservatoryTabBar";
import { useTheme } from "@/components/design-system/useTheme";

const EDITORIAL_TAB_TRANSITION = {
  animation: "timing" as const,
  config: {
    duration: 220,
    easing: Easing.out(Easing.cubic),
  },
};

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={(props) => <ConservatoryTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        sceneStyle: {
          backgroundColor: colors.surface,
        },
        transitionSpec: EDITORIAL_TAB_TRANSITION,
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 1, 0],
            }),
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [6, 0, 2],
                }),
              },
            ],
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Garden",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Discovery",
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
        }}
      />
      <Tabs.Screen
        name="graveyard"
        options={{
          title: "Graveyard",
        }}
      />
    </Tabs>
  );
}

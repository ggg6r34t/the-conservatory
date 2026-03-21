import { Tabs } from "expo-router";
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/components/design-system/useTheme";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.surface,
        tabBarInactiveTintColor: colors.outline,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 0,
          height: 88,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 4,
        },
        tabBarActiveBackgroundColor: colors.primary,
        tabBarLabelStyle: {
          fontFamily: "Manrope_700Bold",
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Garden",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={22} name="sprout" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Discovery",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={22}
              name="compass-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="graveyard"
        options={{
          title: "Graveyard",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={22}
              name="skull-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={22}
              name="account-circle-outline"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

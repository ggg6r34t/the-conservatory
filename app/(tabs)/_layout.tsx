import { Tabs } from "expo-router";
import React from "react";

import { ConservatoryTabBar } from "@/components/navigation/ConservatoryTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ConservatoryTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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

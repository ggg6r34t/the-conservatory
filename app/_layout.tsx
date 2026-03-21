import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { Providers } from "@/providers/Providers";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { isReady } = useAuth();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Providers>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="plant/add"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="plant/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="care-log/[id]"
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "fade",
          }}
        />
      </Stack>
      <StatusBar style="dark" />
    </Providers>
  );
}

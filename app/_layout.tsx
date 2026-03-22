import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { Providers } from "@/providers/Providers";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { isReady, isAuthenticated } = useAuth();

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
      <RootNavigator isAuthenticated={isAuthenticated} />
      <StatusBar style="dark" />
    </Providers>
  );
}

function RootNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  const segments = useSegments();
  const isAuthRoute = segments[0] === "(auth)";

  if (!isAuthenticated && !isAuthRoute) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && isAuthRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="care-reminders" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
      <Stack.Screen name="archive-gallery" options={{ headerShown: false }} />
      <Stack.Screen name="specimen-tags" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-security" options={{ headerShown: false }} />
      <Stack.Screen name="data-backup" options={{ headerShown: false }} />
      <Stack.Screen name="interface-theme" options={{ headerShown: false }} />
      <Stack.Screen
        name="plant/add"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="plant/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="plant/[id]/edit"
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
  );
}

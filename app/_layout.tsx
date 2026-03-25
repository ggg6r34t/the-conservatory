import {
  Redirect,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import {
  resolveEntryRoute,
  resolveSafeAuthRedirectTarget,
} from "@/features/onboarding/utils/resolveEntryRoute";
import { Providers } from "@/providers/Providers";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { isReady, isAuthenticated, authStatus, user } = useAuth();
  const onboarding = useOnboarding(user?.id);

  useEffect(() => {
    if (isReady && onboarding.isReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isReady, onboarding.isReady]);

  if (!isReady || !onboarding.isReady) {
    return null;
  }

  return (
    <Providers>
      <RootNavigator
        authStatus={
          authStatus === "authenticated" ? "authenticated" : "anonymous"
        }
        isAuthenticated={isAuthenticated}
        onboardingStatus={onboarding.status}
      />
      <StatusBar style="dark" />
    </Providers>
  );
}

function RootNavigator({
  authStatus,
  isAuthenticated,
  onboardingStatus,
}: {
  authStatus: "authenticated" | "anonymous";
  isAuthenticated: boolean;
  onboardingStatus: "pending" | "completed";
}) {
  const debugRoutes = __DEV__
    ? [
        "debug/onboarding",
        "debug/onboarding-welcome",
        "debug/onboarding-walkthrough",
        "debug/onboarding-permissions",
        "debug/onboarding-quick-start",
      ]
    : [];
  const segments = useSegments();
  const pathname = usePathname();
  const { redirectTo } = useGlobalSearchParams<{ redirectTo?: string }>();
  const isAuthRoute = segments[0] === "(auth)";
  const isTabRoute = segments[0] === "(tabs)";
  const isIndexRoute = pathname === "/" && !isTabRoute;
  const isOnboardingRoute = segments[0] === "onboarding";
  const isDebugRoute = segments[0] === "debug";
  const expectedPublicEntry = resolveEntryRoute({
    authStatus,
    onboardingStatus,
  });
  const safeRedirectTo = resolveSafeAuthRedirectTarget(redirectTo);

  if (isDebugRoute && !__DEV__) {
    return <Redirect href={expectedPublicEntry} />;
  }

  if (
    !isAuthenticated &&
    !isAuthRoute &&
    !isIndexRoute &&
    !isOnboardingRoute &&
    !isDebugRoute
  ) {
    return <Redirect href={expectedPublicEntry} />;
  }

  if (!isTabRoute && pathname === "/" && expectedPublicEntry !== "/") {
    return <Redirect href={expectedPublicEntry} />;
  }

  if (
    !isAuthenticated &&
    isOnboardingRoute &&
    onboardingStatus === "completed"
  ) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && isOnboardingRoute) {
    return <Redirect href="/(tabs)" />;
  }

  if (isAuthenticated && isAuthRoute) {
    return <Redirect href={safeRedirectTo} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {debugRoutes.map((routeName) => (
        <Stack.Screen
          key={routeName}
          name={routeName}
          options={{ headerShown: false }}
        />
      ))}
      <Stack.Screen
        name="onboarding/walkthrough"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="onboarding/gallery"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="onboarding/care-rhythm"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="onboarding/graveyard"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="onboarding/permissions"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="onboarding/quick-start"
        options={{ headerShown: false }}
      />
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
        name="plant/[id]/timeline"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="memorial/[id]"
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

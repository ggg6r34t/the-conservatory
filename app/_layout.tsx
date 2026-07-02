import {
  Redirect,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";

import { ThemedStatusBar } from "@/components/design-system/ThemedStatusBar";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import {
  resolveEntryRoute,
  resolveSafeAuthRedirectTarget,
} from "@/features/onboarding/utils/resolveEntryRoute";
import { Providers } from "@/providers/Providers";
import { wrapWithCrashReporting } from "@/services/observability/crashReportingService";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayout() {
  const { isReady, isAuthenticated, authStatus, user } = useAuth();
  const onboarding = useOnboarding(user?.id);

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
      <ThemedStatusBar />
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
  const authChildSegment = segments.at(1);
  const isResetPasswordRoute =
    isAuthRoute && authChildSegment === "reset-password";
  const passwordRecoveryActive = usePasswordRecoveryStore(
    (state) => state.isActive,
  );
  const isTabRoute = segments[0] === "(tabs)";
  const isIndexRoute = pathname === "/" && !isTabRoute;
  const isOnboardingRoute = segments[0] === "onboarding";
  const isDebugRoute = segments[0] === "debug";
  const isOAuthCallbackRoute = pathname === "/auth/callback";
  const expectedPublicEntry = resolveEntryRoute({
    authStatus,
    onboardingStatus,
  });
  const safeRedirectTo = resolveSafeAuthRedirectTarget(redirectTo);
  const { colors } = useTheme();
  const drillInScreenOptions = {
    headerShown: false,
    presentation: "card" as const,
    animation: "simple_push" as const,
    animationDuration: 260,
    animationMatchesGesture: true,
    contentStyle: {
      backgroundColor: colors.surface,
    },
  };

  if (passwordRecoveryActive && !isResetPasswordRoute) {
    return <Redirect href="/(auth)/reset-password" />;
  }

  if (isDebugRoute && !__DEV__) {
    return <Redirect href={expectedPublicEntry} />;
  }

  if (
    !isAuthenticated &&
    !isAuthRoute &&
    !isIndexRoute &&
    !isOnboardingRoute &&
    !isDebugRoute &&
    !isOAuthCallbackRoute
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

  if (isAuthenticated && isAuthRoute && !isResetPasswordRoute) {
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
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={drillInScreenOptions} />
      <Stack.Screen name="change-password" options={drillInScreenOptions} />
      <Stack.Screen name="highlights" options={drillInScreenOptions} />
      <Stack.Screen name="care-reminders" options={drillInScreenOptions} />
      <Stack.Screen name="care-calendar" options={drillInScreenOptions} />
      <Stack.Screen name="profile-edit" options={drillInScreenOptions} />
      <Stack.Screen name="archive-gallery" options={drillInScreenOptions} />
      <Stack.Screen name="specimen-tags" options={drillInScreenOptions} />
      <Stack.Screen name="specimen-scan" options={drillInScreenOptions} />
      <Stack.Screen name="backup-details" options={drillInScreenOptions} />
      <Stack.Screen name="sync-repair" options={drillInScreenOptions} />
      <Stack.Screen
        name="export-collection-data"
        options={drillInScreenOptions}
      />
      <Stack.Screen
        name="import-collection-data"
        options={drillInScreenOptions}
      />
      <Stack.Screen name="privacy-security" options={drillInScreenOptions} />
      <Stack.Screen name="downgrade" options={drillInScreenOptions} />
      <Stack.Screen name="terms" options={drillInScreenOptions} />
      <Stack.Screen name="privacy" options={drillInScreenOptions} />
      <Stack.Screen name="license" options={drillInScreenOptions} />
      <Stack.Screen name="subscription-terms" options={drillInScreenOptions} />
      <Stack.Screen name="ai-disclosure" options={drillInScreenOptions} />
      <Stack.Screen
        name="privacy-security-statement"
        options={drillInScreenOptions}
      />
      <Stack.Screen name="data-retention" options={drillInScreenOptions} />
      <Stack.Screen name="data-export-policy" options={drillInScreenOptions} />
      <Stack.Screen
        name="account-deletion-policy"
        options={drillInScreenOptions}
      />
      <Stack.Screen name="premium" options={drillInScreenOptions} />
      <Stack.Screen name="subscription-plans" options={drillInScreenOptions} />
      <Stack.Screen name="data-backup" options={drillInScreenOptions} />
      <Stack.Screen name="interface-theme" options={drillInScreenOptions} />
      <Stack.Screen name="feature-requests/index" options={drillInScreenOptions} />
      <Stack.Screen name="feature-requests/new" options={drillInScreenOptions} />
      <Stack.Screen name="feature-requests/[id]" options={drillInScreenOptions} />
      <Stack.Screen name="roadmap" options={drillInScreenOptions} />
      <Stack.Screen name="plant/add" options={drillInScreenOptions} />
      <Stack.Screen name="plant/[id]" options={drillInScreenOptions} />
      <Stack.Screen name="plant/[id]/edit" options={drillInScreenOptions} />
      <Stack.Screen name="plant/[id]/timeline" options={drillInScreenOptions} />
      <Stack.Screen name="plant/[id]/activity" options={drillInScreenOptions} />
      <Stack.Screen name="memorial/[id]" options={drillInScreenOptions} />
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

export default wrapWithCrashReporting(RootLayout);

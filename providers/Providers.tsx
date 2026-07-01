import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PropsWithChildren, useEffect } from "react";
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import {
  NotoSerif_400Regular,
  NotoSerif_400Regular_Italic,
  NotoSerif_700Bold,
} from "@expo-google-fonts/noto-serif";

import { BotanicalThemeProvider } from "@/components/design-system/Theme";
import { DatabaseBootstrapGate } from "@/components/feedback/DatabaseBootstrapGate";
import { ReleaseConfigGate } from "@/components/feedback/ReleaseConfigGate";
import { SyncAutoFailureNotifier } from "@/components/feedback/SyncAutoFailureNotifier";
import { AlertProvider } from "@/providers/AlertProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { SnackbarProvider } from "@/providers/SnackbarProvider";
import { BillingBootstrapProvider } from "@/providers/BillingBootstrapProvider";
import { ThemeBootstrapProvider } from "@/providers/ThemeBootstrapProvider";
import { ThemeEntitlementSync } from "@/providers/ThemeEntitlementSync";
import { ThemeHydrationGate } from "@/providers/ThemeHydrationGate";
import { SyncBootstrapProvider } from "@/providers/SyncBootstrapProvider";
import { PasswordRecoveryBridge } from "@/features/auth/components/PasswordRecoveryBridge";
import { CareCalendarNotificationBridge } from "@/features/care-calendar/components/CareCalendarNotificationBridge";
import {
  getDatabaseBootstrapState,
  markDatabaseBootstrapFailed,
  markDatabaseBootstrapLoading,
  markDatabaseBootstrapReady,
} from "@/services/database/databaseBootstrap";
import {
  captureException,
  initializeCrashReporting,
} from "@/services/observability/crashReportingService";
import { initializeDatabase } from "@/services/database/sqlite";

export function Providers({ children }: PropsWithChildren) {
  const [loaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    NotoSerif_400Regular,
    NotoSerif_400Regular_Italic,
    NotoSerif_700Bold,
  });

  useEffect(() => {
    initializeCrashReporting();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (getDatabaseBootstrapState().status === "ready") {
      return;
    }

    let cancelled = false;
    markDatabaseBootstrapLoading();
    initializeDatabase()
      .then(() => {
        if (!cancelled) {
          markDatabaseBootstrapReady();
        }
      })
      .catch((error) => {
        if (!cancelled) {
          captureException(error, { surface: "database_bootstrap" });
          markDatabaseBootstrapFailed(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BotanicalThemeProvider>
          <AlertProvider>
            <SnackbarProvider>
              <QueryProvider>
                <ThemeBootstrapProvider>
                  <ThemeHydrationGate>
                    <DatabaseBootstrapGate>
                      <ReleaseConfigGate>
                        <SyncBootstrapProvider>
                          <BillingBootstrapProvider>
                            <ThemeEntitlementSync>
                              <SyncAutoFailureNotifier />
                              <CareCalendarNotificationBridge />
                              <PasswordRecoveryBridge />
                              {children}
                            </ThemeEntitlementSync>
                          </BillingBootstrapProvider>
                        </SyncBootstrapProvider>
                      </ReleaseConfigGate>
                    </DatabaseBootstrapGate>
                  </ThemeHydrationGate>
                </ThemeBootstrapProvider>
              </QueryProvider>
            </SnackbarProvider>
          </AlertProvider>
        </BotanicalThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

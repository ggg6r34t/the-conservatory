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
import { SyncBootstrapProvider } from "@/providers/SyncBootstrapProvider";
import {
  markDatabaseBootstrapFailed,
  markDatabaseBootstrapLoading,
  markDatabaseBootstrapReady,
} from "@/services/database/databaseBootstrap";
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
    if (loaded) {
      markDatabaseBootstrapLoading();
      initializeDatabase()
        .then(() => {
          markDatabaseBootstrapReady();
        })
        .catch((error) => {
          markDatabaseBootstrapFailed(error);
        });
    }
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
                <DatabaseBootstrapGate>
                  <ReleaseConfigGate>
                    <SyncBootstrapProvider>
                      <BillingBootstrapProvider>
                        <SyncAutoFailureNotifier />
                        {children}
                      </BillingBootstrapProvider>
                    </SyncBootstrapProvider>
                  </ReleaseConfigGate>
                </DatabaseBootstrapGate>
              </QueryProvider>
            </SnackbarProvider>
          </AlertProvider>
        </BotanicalThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

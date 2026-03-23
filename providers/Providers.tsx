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
import { QueryProvider } from "@/providers/QueryProvider";
import { SyncBootstrapProvider } from "@/providers/SyncBootstrapProvider";
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
      initializeDatabase().catch(() => undefined);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BotanicalThemeProvider>
          <QueryProvider>
            <SyncBootstrapProvider>{children}</SyncBootstrapProvider>
          </QueryProvider>
        </BotanicalThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

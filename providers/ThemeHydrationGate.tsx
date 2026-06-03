import * as SplashScreen from "expo-splash-screen";
import { useEffect, type PropsWithChildren } from "react";

import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";

/** Blocks app chrome until ThemeBootstrapProvider finishes hydrating preferred theme. */
export function ThemeHydrationGate({ children }: PropsWithChildren) {
  const hydrated = useThemeRuntimeStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  return children;
}

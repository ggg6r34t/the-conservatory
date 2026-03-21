import { createContext, useMemo, type PropsWithChildren } from "react";
import { PaperProvider } from "react-native-paper";

import { botanicalPaperTheme } from "@/config/theme";
import { tokens, type BotanicalTokens } from "@/styles/tokens";

export interface BotanicalThemeValue extends BotanicalTokens {
  paperTheme: typeof botanicalPaperTheme;
}

export const BotanicalThemeContext = createContext<BotanicalThemeValue>({
  ...tokens,
  paperTheme: botanicalPaperTheme,
});

export function BotanicalThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo(
    () => ({
      ...tokens,
      paperTheme: botanicalPaperTheme,
    }),
    [],
  );

  return (
    <BotanicalThemeContext.Provider value={value}>
      <PaperProvider theme={botanicalPaperTheme}>{children}</PaperProvider>
    </BotanicalThemeContext.Provider>
  );
}

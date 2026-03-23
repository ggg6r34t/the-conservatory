import type { PropsWithChildren, ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react-native";

import { BotanicalThemeContext } from "@/components/design-system/Theme";
import { botanicalPaperTheme } from "@/config/theme";
import { AlertProvider } from "@/providers/AlertProvider";
import { SnackbarProvider } from "@/providers/SnackbarProvider";
import { tokens } from "@/styles/tokens";

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  function TestProviders({ children }: PropsWithChildren) {
    return (
      <BotanicalThemeContext.Provider
        value={{ ...tokens, paperTheme: botanicalPaperTheme }}
      >
        <AlertProvider>
          <SnackbarProvider>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
          </SnackbarProvider>
        </AlertProvider>
      </BotanicalThemeContext.Provider>
    );
  }

  const rendered = render(ui, { wrapper: TestProviders });

  return {
    ...rendered,
    queryClient: client,
  };
}

afterEach(() => {
  cleanup();
});

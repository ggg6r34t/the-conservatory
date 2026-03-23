import type { PropsWithChildren, ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react-native";

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
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
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

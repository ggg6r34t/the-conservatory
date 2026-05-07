import { QueryClient } from "@tanstack/react-query";

const createdClients: QueryClient[] = [];

export function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  createdClients.push(client);
  return client;
}

afterEach(() => {
  while (createdClients.length > 0) {
    const client = createdClients.pop();
    client?.clear();
    client?.unmount();
  }
});

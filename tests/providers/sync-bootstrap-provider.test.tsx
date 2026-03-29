import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import { SyncBootstrapProvider } from "@/providers/SyncBootstrapProvider";
import { notifySyncQueueChanged } from "@/services/database/syncSignals";

const mockGetUserPreferences = jest.fn();
const mockRunUserDataSync = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    authStatus: "authenticated",
  }),
}));

jest.mock("@/hooks/useNetworkState", () => ({
  useNetworkState: () => ({ isOffline: false }),
}));

jest.mock("@/features/auth/api/authClient", () => ({
  waitForAuthPersistenceIdle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
}));

jest.mock("@/features/profile/utils/invalidateBackupQueries", () => ({
  invalidateBackupQueries: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/database/userDataSync", () => ({
  runUserDataSync: (...args: unknown[]) => mockRunUserDataSync(...args),
}));

describe("SyncBootstrapProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserPreferences.mockResolvedValue({ autoSyncEnabled: true });
    mockRunUserDataSync.mockResolvedValue(undefined);
  });

  it("triggers the canonical sync executor when auto sync is enabled and the queue changes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SyncBootstrapProvider>
          <Text>child</Text>
        </SyncBootstrapProvider>
      </QueryClientProvider>,
    );

    notifySyncQueueChanged();

    await waitFor(() => {
      expect(mockRunUserDataSync).toHaveBeenCalledWith({
        userId: "user-1",
        trigger: "auto-queue",
      });
    });
  });

  it("does not auto sync queued changes when the persisted preference is off", async () => {
    mockGetUserPreferences.mockResolvedValueOnce({ autoSyncEnabled: false });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SyncBootstrapProvider>
          <Text>child</Text>
        </SyncBootstrapProvider>
      </QueryClientProvider>,
    );

    notifySyncQueueChanged();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockRunUserDataSync).not.toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "auto-queue" }),
    );
  });
});

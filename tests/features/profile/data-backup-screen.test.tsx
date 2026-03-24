import { screen, waitFor } from "@testing-library/react-native";
import React from "react";

import DataBackupScreen from "@/app/data-backup";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockGetBackupSummary = jest.fn();
const mockGetRemoteBackupAvailability = jest.fn();
const mockPrimaryButton = jest.fn(
  (_props: { label: string; disabled?: boolean }) => null,
);

jest.mock("@/features/profile/api/profileClient", () => ({
  getBackupSummary: (...args: unknown[]) => mockGetBackupSummary(...args),
  getRemoteBackupAvailability: (...args: unknown[]) =>
    mockGetRemoteBackupAvailability(...args),
  runBackupSync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/hooks/useNetworkState", () => ({
  useNetworkState: () => ({ isOffline: false }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: (props: { label: string; disabled?: boolean }) =>
    mockPrimaryButton(props),
}));

jest.mock("@/features/profile/components/ProfileScreenScaffold", () => ({
  ProfileScreenScaffold: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("DataBackupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBackupSummary.mockResolvedValue({
      activePlants: 2,
      archivedPlants: 1,
      photos: 4,
      careLogs: 6,
      reminders: 2,
      pendingSyncUser: 1,
      failedSyncUser: 0,
      pendingSyncQueueAccount: 2,
      failedSyncQueueAccount: 1,
      pendingSyncDevice: 3,
      failedSyncDevice: 1,
      processingSync: 0,
      completedSync: 3,
    });
  });

  it("renders a local-only state when remote backup is unavailable", async () => {
    mockGetRemoteBackupAvailability.mockResolvedValue({
      state: "local-only",
      canSync: false,
      title: "Local device only",
      description: "Your conservatory is currently stored only on this device.",
    });

    renderWithProviders(<DataBackupScreen />);

    await waitFor(() => {
      expect(screen.getByText("Local device only")).toBeTruthy();
    });

    expect(mockPrimaryButton).toHaveBeenLastCalledWith(
      expect.objectContaining({ label: "Run Sync Now", disabled: true }),
    );
  });

  it("renders an active remote state when Supabase is reachable", async () => {
    mockGetRemoteBackupAvailability.mockResolvedValue({
      state: "available",
      canSync: true,
      title: "Remote backup available",
      description: "Supabase is configured and reachable.",
    });

    renderWithProviders(<DataBackupScreen />);

    await waitFor(() => {
      expect(screen.getByText("Remote backup available")).toBeTruthy();
    });

    expect(screen.getByText("Queue waiting (account)")).toBeTruthy();
    expect(
      screen.getByText("Waiting on this device (all accounts)"),
    ).toBeTruthy();

    expect(mockPrimaryButton).toHaveBeenLastCalledWith(
      expect.objectContaining({ label: "Run Sync Now", disabled: false }),
    );
  });
});

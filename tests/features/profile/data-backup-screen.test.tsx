import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";

import DataBackupScreen from "@/app/data-backup";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockMutate = jest.fn();
const mockUseBackupStatus = jest.fn();
const mockPrimaryButton = jest.fn(
  (props: {
    label: string;
    disabled?: boolean;
    onPress?: () => void;
  }) => null,
);

jest.mock("@/features/profile/hooks/useBackupStatus", () => ({
  useBackupStatus: () => mockUseBackupStatus(),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: (props: {
    label: string;
    disabled?: boolean;
    onPress?: () => void;
  }) => mockPrimaryButton(props),
}));

jest.mock("@/features/profile/components/ProfileScreenScaffold", () => ({
  ProfileScreenScaffold: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe("DataBackupScreen", () => {
  const baseStatus = {
    overviewState: "Auto sync is on",
    overviewSupportingLabel: "Cloud backup is enabled and healthy.",
    overviewSecondaryValue: "Mar 29, 6:00 PM",
    syncMutation: { isPending: false, mutate: jest.fn() },
    canSync: true,
    autoSyncEnabled: true,
    autoSyncMutation: { isPending: false, mutate: mockMutate },
    canToggleAutoSync: true,
    cloudSyncTitle: "Auto-sync Conservatory",
    cloudSyncDescription:
      "Automatically back up plants, care history, reminders, and progress photos to cloud storage.",
    isSyncRunning: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBackupStatus.mockReturnValue(baseStatus);
  });

  it("renders the mockup-aligned cloud sync control with auto sync enabled", () => {
    renderWithProviders(<DataBackupScreen />);

    expect(screen.getByText("Auto-sync Conservatory")).toBeTruthy();
    expect(screen.getByText("Auto sync is on")).toBeTruthy();
    expect(mockPrimaryButton).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Sync Now", disabled: false }),
    );
  });

  it("lets the user disable auto sync from the cloud sync card", () => {
    renderWithProviders(<DataBackupScreen />);

    fireEvent.press(screen.getByRole("switch"));

    expect(mockMutate).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("keeps manual sync truthful while a canonical sync run is already active", () => {
    mockUseBackupStatus.mockReturnValue({
      ...baseStatus,
      isSyncRunning: true,
      canSync: false,
    });

    renderWithProviders(<DataBackupScreen />);

    expect(mockPrimaryButton).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Syncing Now...", disabled: true }),
    );
  });
});

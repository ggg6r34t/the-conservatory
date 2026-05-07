import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import SyncRepairScreen from "@/app/sync-repair";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockListSyncRepairItems = jest.fn();
const mockRetrySyncRepairItems = jest.fn();
const mockSuccess = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@/features/profile/services/syncRepairService", () => ({
  listSyncRepairItems: (...args: unknown[]) => mockListSyncRepairItems(...args),
  retrySyncRepairItems: (...args: unknown[]) => mockRetrySyncRepairItems(...args),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: mockSuccess }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
  }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerLow: "#eee",
      surfaceContainerLowest: "#fff",
      primary: "#111",
      secondary: "#333",
      onSurfaceVariant: "#666",
    },
    spacing: { lg: 16 },
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("SyncRepairScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSyncRepairItems.mockResolvedValue([
      {
        id: "sync-1",
        entity: "care_logs",
        entityId: "log-1",
        operation: "update",
        status: "failed",
        attemptCount: 3,
        lastError: "Network unavailable",
        queuedAt: "2026-05-06T10:00:00.000Z",
        updatedAt: "2026-05-06T10:05:00.000Z",
      },
    ]);
    mockRetrySyncRepairItems.mockResolvedValue(1);
  });

  it("shows operational diagnostics and can retry one queue item", async () => {
    renderWithProviders(<SyncRepairScreen />);

    expect(await screen.findByText("care logs")).toBeTruthy();
    expect(screen.getByText("UPDATE - FAILED - 3 attempts")).toBeTruthy();
    expect(screen.getByText("Network unavailable")).toBeTruthy();

    fireEvent.press(screen.getByText("Retry Item"));

    await waitFor(() =>
      expect(mockRetrySyncRepairItems).toHaveBeenCalledWith(["sync-1"]),
    );
    await waitFor(() => expect(mockListSyncRepairItems).toHaveBeenCalledTimes(2));
    expect(mockSuccess).toHaveBeenCalledWith("Backup item is ready to retry.");
  });
});

import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Modal } from "react-native";

import CareRemindersScreen from "@/app/care-reminders";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    tier: 'free',
    isLoading: false,
    isRestoring: false,
    expiresAt: null,
    period: null,
    error: null,
    offerings: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshOfferings: jest.fn(),
  }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return {
    BlurView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surface: "#fff",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerHigh: "#ddd",
      surfaceBright: "#fff",
      primary: "#111",
      secondary: "#444",
      onSurface: "#222",
      onSurfaceVariant: "#666",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const mockMutateAsync = jest.fn();
const mockDeleteMutateAsync = jest.fn();
const mockConfirm = jest.fn();
const mockSuccess = jest.fn();

jest.mock("@/features/plants/hooks/usePlants", () => ({
  usePlants: () => ({ data: [] }),
  useAllActivePlants: () => ({
    data: [
      {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        nextWaterDueAt: "2026-05-08T09:00:00.000Z",
        lastWateredAt: "2026-05-01T09:00:00.000Z",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-01T09:00:00.000Z",
        pending: 0,
        primaryPhotoUri: null,
      },
    ],
  }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({
    data: [
      {
        id: "reminder-1",
        userId: "user-1",
        plantId: "plant-1",
        reminderType: "water",
        frequencyDays: 7,
        enabled: 1,
        nextDueAt: "2026-05-08T09:00:00.000Z",
        lastTriggeredAt: null,
        notificationId: "notification-1",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-01T09:00:00.000Z",
        updatedBy: "user-1",
        pending: 0,
        syncedAt: null,
        syncError: null,
      },
    ],
  }),
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    data: {
      remindersEnabled: true,
      defaultWateringHour: 9,
    },
  }),
}));

jest.mock("@/features/settings/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/features/notifications/hooks/useSetReminder", () => ({
  useSetReminder: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock("@/features/notifications/hooks/useDeleteReminder", () => ({
  useDeleteReminder: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn(), confirm: mockConfirm }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: mockSuccess, warning: jest.fn() }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress?: () => void;
  }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

describe("CareRemindersScreen copy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
    mockMutateAsync.mockResolvedValue(undefined);
    mockDeleteMutateAsync.mockResolvedValue(undefined);
  });

  it("describes reminder preferences as account-backed instead of device-only", () => {
    renderWithProviders(<CareRemindersScreen />);

    expect(
      screen.getByText(
        /saves on this device right away and keeps your account up to date/i,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(/only changes reminders on this device/i),
    ).toBeNull();
  });

  it("opens a reminder workflow instead of creating a reminder immediately", () => {
    const view = renderWithProviders(<CareRemindersScreen />);

    fireEvent.press(screen.getByText("Add Reminder"));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(view.UNSAFE_getByType(Modal).props.visible).toBe(true);
    expect(view.UNSAFE_getByType(Modal).props.transparent).toBe(true);
    expect(screen.getByText("New reminder")).toBeTruthy();
    expect(screen.getByText("Save Reminder")).toBeTruthy();
  });

  it("saves the selected reminder from the workflow", async () => {
    renderWithProviders(<CareRemindersScreen />);

    fireEvent.press(screen.getByText("Add Reminder"));
    fireEvent.press(screen.getByText("Mist"));
    fireEvent.press(screen.getByText("Save Reminder"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          plantId: "plant-1",
          reminderType: "mist",
          frequencyDays: 3,
        }),
      ),
    );
  });

  it("removes an existing reminder through a confirmation flow", async () => {
    renderWithProviders(<CareRemindersScreen />);

    fireEvent.press(screen.getByText("Remove"));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Remove reminder?",
      }),
    );
    await waitFor(() =>
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
        reminderId: "reminder-1",
        plantId: "plant-1",
      }),
    );
  });
});

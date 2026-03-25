import { screen } from "@testing-library/react-native";
import React from "react";

import CareRemindersScreen from "@/app/care-reminders";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

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

jest.mock("@/features/plants/hooks/usePlants", () => ({
  usePlants: () => ({ data: [] }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({ data: [] }),
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
  useSetReminder: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

describe("CareRemindersScreen copy", () => {
  it("describes reminder preferences as account-backed instead of device-only", () => {
    renderWithProviders(<CareRemindersScreen />);

    expect(
      screen.getByText(
        /updates on this device right away and syncs with your account/i,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(/only changes reminders on this device/i),
    ).toBeNull();
  });
});

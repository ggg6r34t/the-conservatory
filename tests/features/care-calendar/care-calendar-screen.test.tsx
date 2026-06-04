import { screen } from "@testing-library/react-native";
import React from "react";

import CareCalendarScreen from "@/app/care-calendar";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("@/features/ai/services/aiCache", () => ({
  getCachedValue: jest.fn(async () => null),
  setCachedValue: jest.fn(async () => undefined),
  removeCachedValue: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(() => callback(), [callback]);
  },
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    tier: "free",
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

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  useAllActivePlants: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/features/care-logs/hooks/useCareLogsForPlantIds", () => ({
  useCareLogsForPlantIds: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({
    show: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

jest.mock("@/components/common/Buttons/SecondaryButton", () => ({
  SecondaryButton: ({
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
      primaryContainer: "#e8efe8",
      onPrimaryContainer: "#111",
      outline: "#bbb",
      error: "#a33",
    },
    spacing: { lg: 16 },
  }),
}));

describe("CareCalendarScreen", () => {
  it("shows the no plants empty state", () => {
    renderWithProviders(<CareCalendarScreen />);
    expect(screen.getByText("Begin with one plant")).toBeTruthy();
    expect(screen.getByText("Add plant")).toBeTruthy();
  });
});

import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import CareCalendarScreen from "@/app/care-calendar";
import { deriveCareCalendarEvents } from "@/features/care-calendar/services/careCalendarDerivationService";
import { createCareLog } from "@/features/care-logs/api/careLogsClient";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: mockPush,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/features/ai/services/aiCache", () => ({
  getCachedValue: jest.fn(async () => null),
  setCachedValue: jest.fn(async () => undefined),
  removeCachedValue: jest.fn(async () => undefined),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: true,
    tier: "premium",
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
  useAllActivePlants: () => ({
    data: [
      {
        id: "plant-1",
        userId: "user-1",
        name: "Monstera",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        nextWaterDueAt: "2026-06-04T09:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        pending: 0,
      },
    ],
    isLoading: false,
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
        nextDueAt: "2026-06-04T09:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        pending: 0,
      },
    ],
    isLoading: false,
  }),
}));

jest.mock("@/features/care-logs/hooks/useCareLogsForPlantIds", () => ({
  useCareLogsForPlantIds: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/features/care-calendar/api/careScheduleSuggestionsClient", () => ({
  listCareScheduleSuggestions: jest.fn(async () => []),
}));

jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  createCareLog: jest.fn(async () => ({
    careLog: {
      id: "log-1",
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
      loggedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pending: 0,
    },
  })),
}));

jest.mock("@/features/notifications/hooks/useSetReminder", () => ({
  useSetReminder: jest.fn(),
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
      tertiaryContainer: "#e0e8d8",
      onTertiary: "#111",
      outline: "#bbb",
      error: "#a33",
      backdrop: "rgba(0,0,0,0.32)",
    },
    spacing: { lg: 16 },
  }),
}));

describe("care calendar e2e flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("derives a water task and surfaces log care on the calendar screen", async () => {
    const events = deriveCareCalendarEvents({
      plants: [
        {
          id: "plant-1",
          userId: "user-1",
          name: "Monstera",
          speciesName: "Monstera deliciosa",
          status: "active",
          wateringIntervalDays: 7,
          nextWaterDueAt: "2026-06-04T09:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          pending: 0,
        },
      ],
      reminders: [
        {
          id: "reminder-1",
          userId: "user-1",
          plantId: "plant-1",
          reminderType: "water",
          frequencyDays: 7,
          enabled: 1,
          nextDueAt: "2026-06-04T09:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          pending: 0,
        },
      ],
      logs: [],
      now: new Date("2026-06-04T12:00:00.000Z"),
    });

    expect(events.some((event) => event.careType === "water")).toBe(true);

    renderWithProviders(<CareCalendarScreen />);

    await waitFor(() => {
      expect(screen.getByText("Monstera")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Log care"));
    await waitFor(() => {
      expect(createCareLog).toHaveBeenCalled();
    });
  });
});

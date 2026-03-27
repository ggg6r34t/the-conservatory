import { screen, waitFor } from "@testing-library/react-native";
import React from "react";

import LibraryScreen from "@/app/(tabs)/library";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { CareLog, CareReminder, Plant } from "@/types/models";

const mockListCareLogsForPlants = jest.fn();

function createPlant(id: string, overrides?: Partial<Plant>): Plant {
  return {
    id,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createReminder(plantId: string, overrides?: Partial<CareReminder>): CareReminder {
  return {
    id: `reminder-${plantId}`,
    userId: "user-1",
    plantId,
    reminderType: "water",
    frequencyDays: 7,
    enabled: 1,
    nextDueAt: "2026-03-28T09:00:00.000Z",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(plantId: string, overrides?: Partial<CareLog>): CareLog {
  return {
    id: `log-${plantId}`,
    userId: "user-1",
    plantId,
    logType: "water",
    loggedAt: "2026-03-20T08:00:00.000Z",
    createdAt: "2026-03-20T08:00:00.000Z",
    updatedAt: "2026-03-20T08:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

const mockPlants = [
  createPlant("thriving", {
    name: "Thriving Plant",
    lastWateredAt: "2026-03-23T08:00:00.000Z",
  }),
  createPlant("due", {
    name: "Due Plant",
  }),
  createPlant("stable", {
    name: "Stable Plant",
    wateringIntervalDays: 0,
    nextWaterDueAt: null,
  }),
];

const mockReminders = [
  createReminder("thriving", {
    nextDueAt: "2026-03-30T09:00:00.000Z",
  }),
  createReminder("due", {
    nextDueAt: "2026-03-24T09:00:00.000Z",
  }),
];

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
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
      surfaceContainerLowest: "#fafafa",
      surfaceBright: "#fff",
      primary: "#111",
      primaryContainer: "#ddeedd",
      tertiaryContainer: "#c9d7c4",
      secondaryContainer: "#efe4cf",
      secondaryOnContainer: "#5d3a1a",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      error: "#b3261e",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  usePlants: () => ({
    data: mockPlants,
  }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({
    data: mockReminders,
  }),
}));

jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  listCareLogsForPlants: (...args: unknown[]) => mockListCareLogsForPlants(...args),
}));

jest.mock("@/features/plants/stores/usePlantStore", () => ({
  usePlantStore: (selector: (state: {
    filter: "all";
    query: string;
    setFilter: jest.Mock;
    setQuery: jest.Mock;
  }) => unknown) =>
    selector({
      filter: "all",
      query: "",
      setFilter: jest.fn(),
      setQuery: jest.fn(),
    }),
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

jest.mock("@/components/common/Forms/TextInput", () => ({
  TextInputField: () => null,
}));

jest.mock("@/components/common/TopBar/AppHeader", () => ({
  AppHeader: () => null,
}));

describe("LibraryScreen plant badges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T10:00:00.000Z"));
    mockListCareLogsForPlants.mockResolvedValue([
      createLog("thriving", { loggedAt: "2026-03-23T08:00:00.000Z" }),
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders one truthful badge per plant, including the stable state", async () => {
    renderWithProviders(<LibraryScreen />);

    await waitFor(() => {
      expect(screen.getByText("Thriving Plant")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getAllByText("THRIVING")).toHaveLength(1);
    });

    expect(screen.getByText("NEEDS WATER")).toBeTruthy();
    expect(screen.getByText("STABLE")).toBeTruthy();
    expect(screen.queryByText("NEXT WATER: TBD")).toBeTruthy();
    expect(screen.getAllByText(/THRIVING|NEEDS WATER|STABLE/)).toHaveLength(3);
  });
});

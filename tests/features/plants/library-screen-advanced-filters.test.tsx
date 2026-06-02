import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import LibraryScreen from "@/app/(tabs)/library";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { CareLog, CareReminder, Plant } from "@/types/models";

const mockPush = jest.fn();
const mockSetFilter = jest.fn();
let mockIsPremium = true;
let mockFilter: "all" | "by-location" | "by-species" = "all";

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

const mockPlants = [
  createPlant("kitchen", {
    name: "Kitchen Monstera",
    speciesName: "Monstera deliciosa",
    location: "Kitchen",
  }),
  createPlant("office", {
    name: "Office Ficus",
    speciesName: "Ficus lyrata",
    location: "Office",
  }),
];

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: mockIsPremium,
    tier: mockIsPremium ? "premium" : "free",
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

jest.mock("@/services/analytics/analyticsService", () => ({
  trackMonetizationEvent: jest.fn(),
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
      tertiaryContainer: "#c9d7c4",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      error: "#b3261e",
    },
    spacing: { lg: 16 },
  }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  usePlants: () => ({ data: mockPlants }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({ data: [] as CareReminder[] }),
}));

jest.mock("@/features/care-logs/hooks/useCareLogsForPlantIds", () => ({
  useCareLogsForPlantIds: () => ({ data: [] as CareLog[] }),
}));

jest.mock("@/features/plants/stores/usePlantStore", () => ({
  usePlantStore: (selector: (state: {
    filter: typeof mockFilter;
    query: string;
    setFilter: typeof mockSetFilter;
    setQuery: jest.Mock;
  }) => unknown) =>
    selector({
      filter: mockFilter,
      query: "",
      setFilter: mockSetFilter,
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

describe("LibraryScreen advanced filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPremium = true;
    mockFilter = "all";
  });

  it("activates by-location grouping for premium users", async () => {
    mockFilter = "by-location";
    renderWithProviders(<LibraryScreen />);

    await waitFor(() => {
      expect(screen.getByText("Kitchen")).toBeTruthy();
      expect(screen.getByText("Office")).toBeTruthy();
    });

    expect(screen.getByText("Kitchen Monstera")).toBeTruthy();
    expect(screen.getByText("Office Ficus")).toBeTruthy();
    expect(screen.getByText("MONSTERA DELICIOSA")).toBeTruthy();
    expect(screen.getByText("FICUS LYRATA")).toBeTruthy();
  });

  it("routes free users to premium instead of activating advanced filters", async () => {
    mockIsPremium = false;
    renderWithProviders(<LibraryScreen />);

    fireEvent.press(screen.getByText("By Species"));

    expect(mockSetFilter).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/premium");
  });
});

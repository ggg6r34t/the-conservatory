import React from "react";

import { screen, waitFor } from "@testing-library/react-native";

import JournalScreen from "@/app/(tabs)/journal";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockUseMonthlyHighlights = jest.fn();
const mockListCareLogsForPlants = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: ({ source }: { source?: { uri?: string } }) => {
    const { Text } = require("react-native");
    return <Text>{source?.uri ?? "image"}</Text>;
  },
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
      onSurface: "#111",
      onSurfaceVariant: "#666",
      primary: "#111",
      secondaryOnContainer: "#5d3a1a",
      secondary: "#7a5f42",
      error: "#b3261e",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/features/journal/hooks/useMonthlyHighlights", () => ({
  useMonthlyHighlights: () => mockUseMonthlyHighlights(),
}));

jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  listCareLogsForPlants: (...args: unknown[]) => mockListCareLogsForPlants(...args),
}));

jest.mock("@/features/ai/hooks/useJournalSummary", () => ({
  useJournalSummary: () => ({
    data: null,
  }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/components/common/TopBar/AppHeader", () => ({
  AppHeader: () => null,
}));

jest.mock("@/features/ai/components/JournalSummaryCard", () => ({
  JournalSummaryCard: () => null,
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

jest.mock("@/components/navigation/tabBarMetrics", () => ({
  getFloatingActionBottomOffset: () => 24,
}));

jest.mock("@/features/ai/services/observationTaggingService", () => ({
  parseStructuredCareLogNote: () => ({ body: null }),
}));

describe("JournalScreen monthly highlights preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListCareLogsForPlants.mockResolvedValue([]);
  });

  it("renders the shared monthly highlights preview output", async () => {
    mockUseMonthlyHighlights.mockReturnValue({
      plantsQuery: {
        data: [
          {
            id: "plant-1",
            userId: "user-1",
            name: "Plant 1",
            speciesName: "Monstera deliciosa",
            status: "active",
            wateringIntervalDays: 7,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-20T10:00:00.000Z",
            pending: 0,
          },
        ],
      },
      previewItems: [
        {
          id: "plant-1",
          name: "Plant 1",
          imageUri: "file:///progress-1.jpg",
          date: "2026-03-18T10:00:00.000Z",
          dateLabel: "MAR 18",
          metadata: "LIVING ROOM",
        },
      ],
    });

    renderWithProviders(<JournalScreen />);

    await waitFor(() => {
      expect(screen.getByText("Monthly Highlights")).toBeTruthy();
    });

    expect(screen.getByText("file:///progress-1.jpg")).toBeTruthy();
    expect(screen.getByText("MAR 18")).toBeTruthy();
  });

  it("hides the preview row when no canonical monthly highlights qualify", async () => {
    mockUseMonthlyHighlights.mockReturnValue({
      plantsQuery: {
        data: [
          {
            id: "plant-1",
            userId: "user-1",
            name: "Plant 1",
            speciesName: "Monstera deliciosa",
            status: "active",
            wateringIntervalDays: 7,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-20T10:00:00.000Z",
            pending: 0,
          },
        ],
      },
      previewItems: [],
    });

    renderWithProviders(<JournalScreen />);

    await waitFor(() => {
      expect(screen.queryByText("Monthly Highlights")).toBeNull();
    });
  });
});

import { screen } from "@testing-library/react-native";
import React from "react";

import GrowthTimelineScreen from "@/app/plant/[id]/timeline";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { PlantWithRelations } from "@/types/models";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockUsePlant = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "plant-1" }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock("expo-image", () => ({
  Image: ({ source }: { source?: { uri?: string } }) => {
    const { Text } = require("react-native");
    return <Text>{source?.uri ?? "image"}</Text>;
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/navigation/tabBarMetrics", () => ({
  getFloatingActionBottomOffset: () => 72,
}));

jest.mock("@/features/plants/hooks/usePlant", () => ({
  usePlant: (id: string) => mockUsePlant(id),
}));

jest.mock("@/features/plants/hooks/useAddPlantProgressPhoto", () => ({
  useAddPlantProgressPhoto: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: jest.fn() }),
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

const fixture: PlantWithRelations = {
  plant: {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
  },
  photos: [],
  reminders: [],
  logs: [],
};

describe("GrowthTimelineScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlant.mockReturnValue({
      data: fixture,
      isLoading: false,
    });
  });

  it("renders only canonical progress photos and no fabricated narrative text", () => {
    mockUsePlant.mockReturnValue({
      data: {
        ...fixture,
        photos: [
          {
            id: "photo-primary",
            userId: "user-1",
            plantId: "plant-1",
            localUri: "file:///primary.jpg",
            photoRole: "primary",
            isPrimary: 1,
            capturedAt: "2026-03-01T10:00:00.000Z",
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
            pending: 0,
          },
          {
            id: "photo-progress",
            userId: "user-1",
            plantId: "plant-1",
            localUri: "file:///progress.jpg",
            photoRole: "progress",
            isPrimary: 0,
            capturedAt: "2026-03-03T10:00:00.000Z",
            createdAt: "2026-03-03T10:00:00.000Z",
            updatedAt: "2026-03-03T10:00:00.000Z",
            pending: 0,
          },
        ],
        logs: [
          {
            id: "log-1",
            userId: "user-1",
            plantId: "plant-1",
            logType: "water",
            notes: "Watered thoroughly.",
            loggedAt: "2026-03-04T10:00:00.000Z",
            createdAt: "2026-03-04T10:00:00.000Z",
            updatedAt: "2026-03-04T10:00:00.000Z",
            pending: 0,
          },
        ],
      },
      isLoading: false,
    });

    renderWithProviders(<GrowthTimelineScreen />);

    expect(screen.queryByText("file:///primary.jpg")).toBeNull();
    expect(screen.getAllByText("file:///progress.jpg").length).toBeGreaterThan(0);
    expect(screen.getByText("Water log")).toBeTruthy();
    expect(screen.getByText("Watered thoroughly.")).toBeTruthy();
    expect(screen.queryByText("Arrival from the nursery")).toBeNull();
    expect(screen.queryByText("The latest chapter")).toBeNull();
  });

  it("renders an intentional empty state when no progress photos exist", () => {
    renderWithProviders(<GrowthTimelineScreen />);

    expect(screen.getByText("No timeline moments yet")).toBeTruthy();
    expect(
      screen.getByText("Add your first progress photo to begin this timeline."),
    ).toBeTruthy();
  });
});

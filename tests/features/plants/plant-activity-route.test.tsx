import { screen } from "@testing-library/react-native";
import React from "react";

import PlantActivityRoute from "@/app/plant/[id]/activity";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { PlantWithRelations } from "@/types/models";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "plant-1" }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

const mockUsePlant = jest.fn();

jest.mock("@/features/plants/hooks/usePlant", () => ({
  usePlant: (id: string) => mockUsePlant(id),
}));

describe("PlantActivityRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlant.mockReturnValue({
      data: fixture,
    });
  });

  it("renders an honest empty state when no care logs exist", () => {
    renderWithProviders(<PlantActivityRoute />);

    expect(screen.getByText("Recent Activity")).toBeTruthy();
    expect(screen.getByText("CHRONICLE")).toBeTruthy();
    expect(screen.getByText("Monstera deliciosa")).toBeTruthy();
    expect(screen.getByText("No care history yet")).toBeTruthy();
  });

  it("renders only real activity rows when logs exist", () => {
    mockUsePlant.mockReturnValue({
      data: {
        ...fixture,
        logs: [
          {
            id: "log-1",
            userId: "user-1",
            plantId: "plant-1",
            logType: "water",
            currentCondition: null,
            notes: "Used 10-10-10 liquid fertilizer.",
            loggedAt: "2026-03-25T08:30:00.000Z",
            createdAt: "2026-03-25T08:30:00.000Z",
            updatedAt: "2026-03-25T08:30:00.000Z",
            pending: 0,
          },
        ],
      },
    });

    renderWithProviders(<PlantActivityRoute />);

    expect(screen.getByText("Full Soak & Fertilize")).toBeTruthy();
    expect(screen.getByText("Used 10-10-10 liquid fertilizer.")).toBeTruthy();
    expect(screen.queryByText("No care history yet")).toBeNull();
  });
});

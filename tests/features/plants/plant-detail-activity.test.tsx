import { screen } from "@testing-library/react-native";
import React from "react";
import { fireEvent } from "@testing-library/react-native";

import { PlantDetail } from "@/features/plants/components/PlantDetail";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { PlantWithRelations } from "@/types/models";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/features/ai/components/PlantDetailHealthInsight", () => ({
  PlantDetailHealthInsight: () => null,
}));

jest.mock("@/features/ai/services/careDefaultsService", () => ({
  buildCareDefaults: () => ({
    lightSummary: "Bright indirect light is ideal.",
    careProfileHint: "Water with intention.",
  }),
}));

jest.mock("@/features/ai/services/observationTaggingService", () => ({
  parseStructuredCareLogNote: (notes?: string | null) => ({
    body: notes ?? "",
  }),
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

const baseFixture: PlantWithRelations = {
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

describe("PlantDetail recent activity", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders an honest empty state and no fabricated activity cards", () => {
    renderWithProviders(<PlantDetail data={baseFixture} />);

    expect(screen.getByText("No care entries yet")).toBeTruthy();
    expect(screen.queryByText(/Full Soak & Fertilize/i)).toBeNull();
    expect(screen.queryByText(/Propagation Pruning/i)).toBeNull();
  });

  it("renders saved condition on real activity entries", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          logs: [
            {
              id: "log-1",
              userId: "user-1",
              plantId: "plant-1",
              logType: "inspect",
              currentCondition: "Needs Attention",
              notes: "Edges are crisping.",
              loggedAt: "2026-03-24T10:00:00.000Z",
              createdAt: "2026-03-24T10:00:00.000Z",
              updatedAt: "2026-03-24T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Needs Attention")).toBeTruthy();
    expect(screen.getByText(/Only saved care logs appear here/i)).toBeTruthy();
  });

  it("routes VIEW ALL to the dedicated recent activity screen", () => {
    renderWithProviders(
      <PlantDetail
        data={{
          ...baseFixture,
          logs: [
            {
              id: "log-1",
              userId: "user-1",
              plantId: "plant-1",
              logType: "water",
              currentCondition: null,
              notes: "Saved care entry.",
              loggedAt: "2026-03-24T10:00:00.000Z",
              createdAt: "2026-03-24T10:00:00.000Z",
              updatedAt: "2026-03-24T10:00:00.000Z",
              pending: 0,
            },
          ],
        }}
      />,
    );

    fireEvent.press(screen.getByText("VIEW ALL"));

    expect(mockPush).toHaveBeenCalledWith("/plant/plant-1/activity");
  });
});

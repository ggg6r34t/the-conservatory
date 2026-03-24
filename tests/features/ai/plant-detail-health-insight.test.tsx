import { screen } from "@testing-library/react-native";

import { PlantDetailHealthInsight } from "@/features/ai/components/PlantDetailHealthInsight";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import type { PlantWithRelations } from "@/types/models";

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("@/features/ai/hooks/useHealthInsight", () => ({
  useHealthInsight: jest.fn(),
}));

const { useHealthInsight } = jest.requireMock("@/features/ai/hooks/useHealthInsight") as {
  useHealthInsight: jest.Mock;
};

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

describe("PlantDetailHealthInsight", () => {
  it("renders sufficient-confidence insight content", () => {
    useHealthInsight.mockReturnValue({
      data: {
        title: "Health insight",
        body: "Recent photos suggest steady new growth over the past two weeks.",
        confidence: 0.82,
        source: "local",
      },
    });

    renderWithProviders(
      <PlantDetailHealthInsight plantId="plant-1" data={fixture} />,
    );

    expect(screen.getByText("Health insight")).toBeTruthy();
    expect(screen.getByText(/steady new growth/i)).toBeTruthy();
  });

  it("suppresses the module when confidence is too low", () => {
    useHealthInsight.mockReturnValue({ data: null });

    renderWithProviders(
      <PlantDetailHealthInsight plantId="plant-1" data={fixture} />,
    );

    expect(screen.queryByText("Health insight")).toBeNull();
  });

  it("renders safe fallback content when available", () => {
    useHealthInsight.mockReturnValue({
      data: {
        title: "Health insight",
        body: "Your recent entries suggest stable condition with no obvious change.",
        confidence: 0.63,
        source: "local",
      },
    });

    renderWithProviders(
      <PlantDetailHealthInsight plantId="plant-1" data={fixture} />,
    );

    expect(screen.getByText(/no obvious change/i)).toBeTruthy();
  });

  it("renders nothing when there is no data", () => {
    useHealthInsight.mockReturnValue({ data: null });

    renderWithProviders(
      <PlantDetailHealthInsight plantId="plant-1" data={fixture} />,
    );

    expect(screen.queryByText(/Health insight/i)).toBeNull();
  });
});

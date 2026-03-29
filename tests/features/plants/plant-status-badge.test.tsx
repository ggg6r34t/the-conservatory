import React from "react";

import { screen } from "@testing-library/react-native";

import { PlantStatusBadge } from "@/features/plants/components/PlantStatusBadge";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("PlantStatusBadge", () => {
  it("renders the thriving icon and label", () => {
    renderWithProviders(<PlantStatusBadge healthState="thriving" />);

    expect(screen.getByText("leaf")).toBeTruthy();
    expect(screen.getByText("THRIVING")).toBeTruthy();
  });

  it("renders the stable icon and label", () => {
    renderWithProviders(<PlantStatusBadge healthState="stable" />);

    expect(screen.getByText("leaf")).toBeTruthy();
    expect(screen.getByText("STABLE")).toBeTruthy();
  });

  it("renders the needs-water icon and label", () => {
    renderWithProviders(<PlantStatusBadge healthState="needs_attention" />);

    expect(screen.getByText("water-alert")).toBeTruthy();
    expect(screen.getByText("NEEDS WATER")).toBeTruthy();
  });

  it("renders the detail variant with the canonical status eyebrow", () => {
    renderWithProviders(
      <PlantStatusBadge healthState="stable" variant="detail" />,
    );

    expect(screen.getByText("STATUS")).toBeTruthy();
    expect(screen.getByText("STABLE")).toBeTruthy();
  });
});

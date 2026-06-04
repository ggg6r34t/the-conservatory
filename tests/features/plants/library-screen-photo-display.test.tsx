import { render } from "@testing-library/react-native";
import React from "react";

import { PlantPhotoImage } from "@/features/plants/components/PlantPhotoImage";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerHigh: "#eee",
      surfaceContainerLow: "#ddd",
    },
  }),
}));

jest.mock("expo-image", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Image: ({ source }: { source?: { uri?: string } }) => (
      <Text testID="plant-photo-image">{source?.uri ?? ""}</Text>
    ),
  };
});

function createListPlant(
  overrides?: Partial<PlantListItem>,
): PlantListItem {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Monstera",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    pending: 0,
    primaryPhotoUri: "file:///local-primary.jpg",
    primaryPhotoLocalUri: "file:///local-primary.jpg",
    primaryPhotoRemoteUrl: "https://cdn.example.com/stale.jpg",
    primaryPhotoStoragePath: "user/plant/photo.jpg",
    primaryPhotoRole: "primary",
    primaryPhotoUpdatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("Library plant photo display", () => {
  it("renders local primary photo URI for free-user-style list items", () => {
    const { getByTestId } = render(
      <PlantPhotoImage
        plant={createListPlant()}
        analyticsScreen="library_card"
        style={{ width: 100, height: 100 }}
      />,
    );

    expect(getByTestId("plant-photo-image").props.children).toBe(
      "file:///local-primary.jpg",
    );
  });
});

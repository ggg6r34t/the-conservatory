import { render } from "@testing-library/react-native";
import React from "react";

import { PlantHighlights } from "@/features/dashboard/components/PlantHighlights";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) => (
      <View style={style}>{children}</View>
    ),
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Image: ({ source }: { source?: { uri?: string } }) => (
      <Text testID="dashboard-plant-photo">{source?.uri ?? ""}</Text>
    ),
  };
});

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#111",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerLowest: "#fafafa",
      surfaceBright: "#fff",
      primaryContainer: "#ddeedd",
      primaryFixed: "#fff",
      secondary: "#5d3a1a",
      outlineVariant: "#ccc",
    },
    spacing: { md: 12, lg: 16, xl: 24 },
  }),
}));

jest.mock("@/features/empty-states/components/EmptyState", () => ({
  EmptyState: () => null,
}));

jest.mock("@/features/plants/components/PlantStatusBadge", () => ({
  PlantStatusBadge: () => null,
}));

jest.mock("@/features/plants/services/plantSelectionService", () => ({
  selectPlantHighlights: ({
    plants,
  }: {
    plants: PlantListItem[];
  }) => ({
    featuredPlant: plants[0]
      ? {
          plant: plants[0],
          status: {
            healthState: "thriving",
            isDue: false,
            isOverdue: false,
            isRecentlyWatered: true,
            daysUntilDue: 3,
            effectiveNextWateringDate: null,
          },
        }
      : null,
    secondaryPlants: [],
  }),
}));

const localOnlyPlant: PlantListItem = {
  id: "plant-1",
  userId: "user-1",
  name: "Fiddle",
  speciesName: "Ficus lyrata",
  status: "active",
  wateringIntervalDays: 7,
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
  pending: 0,
  primaryPhotoUri: "file:///dashboard-local.jpg",
  primaryPhotoLocalUri: "file:///dashboard-local.jpg",
  primaryPhotoRemoteUrl: null,
  primaryPhotoStoragePath: "user/plant/photo.jpg",
  primaryPhotoRole: "primary",
  primaryPhotoUpdatedAt: "2026-03-01T10:00:00.000Z",
};

describe("PlantHighlights photo display", () => {
  it("renders locally resolved featured plant photo", () => {
    const { getAllByTestId } = render(
      <PlantHighlights plants={[localOnlyPlant]} reminders={[]} logs={[]} />,
    );

    const uris = getAllByTestId("dashboard-plant-photo").map(
      (node) => node.props.children,
    );

    expect(uris).toContain("file:///dashboard-local.jpg");
  });
});

import React from "react";

import { screen } from "@testing-library/react-native";

import MonthlyHighlightsScreen from "@/app/highlights";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockUseMonthlyHighlights = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
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
      primary: "#111",
      onSurfaceVariant: "#666",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/features/journal/hooks/useMonthlyHighlights", () => ({
  useMonthlyHighlights: () => mockUseMonthlyHighlights(),
}));

jest.mock("@/features/journal/components/MonthlyHighlightsHero", () => ({
  MonthlyHighlightsHero: () => null,
}));

jest.mock("@/features/journal/components/MonthlyHighlightMonthSection", () => ({
  MonthlyHighlightMonthSection: ({
    section,
  }: {
    section: { monthLabel: string; items: { name: string }[] };
  }) => {
    const { Text, View } = require("react-native");

    return (
      <View>
        <Text>{section.monthLabel}</Text>
        {section.items.map((item) => (
          <Text key={item.name}>{item.name}</Text>
        ))}
      </View>
    );
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

describe("MonthlyHighlightsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the shared canonical monthly highlights output instead of a broad archive list", () => {
    mockUseMonthlyHighlights.mockReturnValue({
      sections: [
        {
          key: "2026-03",
          seasonLabel: "EARLY SPRING AWAKENING",
          monthLabel: "March 2026",
          items: [
            {
              id: "plant-1",
              name: "Selected Highlight",
              imageUri: "file:///progress.jpg",
              date: "2026-03-18T10:00:00.000Z",
              dateLabel: "MAR 18",
              metadata: "LIVING ROOM",
            },
          ],
        },
      ],
      isError: false,
    });

    renderWithProviders(<MonthlyHighlightsScreen />);

    expect(screen.getByText("March 2026")).toBeTruthy();
    expect(screen.getByText("Selected Highlight")).toBeTruthy();
    expect(screen.queryByText("No highlights yet")).toBeNull();
  });

  it("shows the intentional empty state when no monthly highlights qualify", () => {
    mockUseMonthlyHighlights.mockReturnValue({
      sections: [],
      isError: false,
    });

    renderWithProviders(<MonthlyHighlightsScreen />);

    expect(screen.getByText("No highlights yet")).toBeTruthy();
  });
});

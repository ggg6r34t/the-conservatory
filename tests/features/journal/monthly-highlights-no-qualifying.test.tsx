import { screen } from "@testing-library/react-native";
import React from "react";

import MonthlyHighlightsScreen from "@/app/highlights";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockUseMonthlyHighlights = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
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
    spacing: { lg: 16 },
  }),
}));

jest.mock("@/features/journal/hooks/useMonthlyHighlights", () => ({
  useMonthlyHighlights: () => mockUseMonthlyHighlights(),
}));

jest.mock("@/features/journal/components/MonthlyHighlightsHero", () => ({
  MonthlyHighlightsHero: () => null,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({ onRefresh: jest.fn(), refreshing: false }),
}));

describe("MonthlyHighlightsScreen qualifying empty", () => {
  it("shows none when photos exist but no month qualifies", () => {
    mockUseMonthlyHighlights.mockReturnValue({
      sections: [],
      isError: false,
      plantsQuery: { data: [{ id: "plant-1" }] },
      photosQuery: { data: [{ id: "photo-1" }] },
    });

    renderWithProviders(<MonthlyHighlightsScreen />);

    expect(screen.getByText("No highlights for this season")).toBeTruthy();
  });
});

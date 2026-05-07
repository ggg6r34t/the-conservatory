import React from "react";

import { screen } from "@testing-library/react-native";

import ExportCollectionDataScreen from "@/app/export-collection-data";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

let mockIsPremium = false;

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: mockIsPremium,
  }),
}));

jest.mock("@/features/export/hooks/useExportCollectionData", () => ({
  useExportCollectionData: () => ({
    summaryQuery: {
      data: {
        plants: 1,
        careLogs: 1,
        photos: 2,
        reminders: 1,
        memorialEntries: 0,
        notes: 1,
      },
      isSuccess: true,
      isLoading: false,
    },
    exportMutation: {
      data: null,
      isPending: false,
      mutateAsync: jest.fn(),
    },
    shareAgain: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("ExportCollectionDataScreen", () => {
  beforeEach(() => {
    mockIsPremium = false;
  });

  it("describes basic export truthfully for free users", () => {
    renderWithProviders(<ExportCollectionDataScreen />);

    expect(screen.getByText("Photo count")).toBeTruthy();
    expect(
      screen.getByText(
        "Basic export includes the number of photos, not photo metadata or file references.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Export Basic Data")).toBeTruthy();
    expect(screen.getByText("Unlock Premium Export")).toBeTruthy();
  });

  it("describes enhanced export truthfully for premium users", () => {
    mockIsPremium = true;

    renderWithProviders(<ExportCollectionDataScreen />);

    expect(screen.getByText("Photo metadata")).toBeTruthy();
    expect(screen.getByText("Enhanced archive included")).toBeTruthy();
    expect(screen.getByText("Export Enhanced Data")).toBeTruthy();
  });
});

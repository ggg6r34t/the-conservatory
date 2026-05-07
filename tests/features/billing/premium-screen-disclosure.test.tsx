import React from "react";

import { screen } from "@testing-library/react-native";

import PremiumScreen from "@/app/premium";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockBack = jest.fn();
const mockRefreshOfferings = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    isLoading: false,
    isRestoring: false,
    error: null,
    offerings: {
      packages: [
        {
          identifier: "$rc_monthly",
          packageType: "monthly",
          priceString: "$5.99",
          pricePerMonthString: "$5.99",
          productIdentifier: "conservatory_premium_monthly",
          introductoryPrice: null,
        },
      ],
      annual: null,
      monthly: {
        identifier: "$rc_monthly",
        packageType: "monthly",
        priceString: "$5.99",
        pricePerMonthString: "$5.99",
        productIdentifier: "conservatory_premium_monthly",
        introductoryPrice: null,
      },
      lifetime: null,
    },
    lastVerifiedAt: null,
    entitlementUnavailable: false,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshOfferings: mockRefreshOfferings,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("PremiumScreen disclosures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows renewal and cancellation terms even when the package has no trial", () => {
    renderWithProviders(<PremiumScreen />);

    expect(
      screen.getByText(/renew automatically until cancelled/i),
    ).toBeTruthy();
    expect(screen.getByText(/Cancel anytime in/i)).toBeTruthy();
    expect(screen.getByText("Restore purchases")).toBeTruthy();
    expect(screen.getByText("Terms")).toBeTruthy();
    expect(screen.getByText("Privacy")).toBeTruthy();
  });
});

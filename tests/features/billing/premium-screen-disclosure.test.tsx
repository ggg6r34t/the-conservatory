import React from "react";

import { fireEvent, screen } from "@testing-library/react-native";

import PremiumScreen from "@/app/premium";
import SubscriptionPlansScreen from "@/app/subscription-plans";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefreshOfferings = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    tier: "free",
    period: null,
    isLoading: false,
    isRestoring: false,
    error: null,
    offerings: {
      packages: [
        {
          identifier: "$rc_annual",
          packageType: "annual",
          priceString: "$44.99",
          pricePerMonthString: "$3.75",
          productIdentifier: "conservatory_premium_annual",
          introductoryPrice: "7-day free trial",
        },
        {
          identifier: "$rc_monthly",
          packageType: "monthly",
          priceString: "$6.99",
          pricePerMonthString: "$6.99",
          productIdentifier: "conservatory_premium_monthly",
          introductoryPrice: null,
        },
      ],
      annual: {
        identifier: "$rc_annual",
        packageType: "annual",
        priceString: "$44.99",
        pricePerMonthString: "$3.75",
        productIdentifier: "conservatory_premium_annual",
        introductoryPrice: "7-day free trial",
      },
      monthly: {
        identifier: "$rc_monthly",
        packageType: "monthly",
        priceString: "$6.99",
        pricePerMonthString: "$6.99",
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

describe("Premium subscription screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the dedicated plan selector from the membership card", () => {
    renderWithProviders(<PremiumScreen />);

    expect(screen.getByText("The Seedling")).toBeTruthy();
    fireEvent.press(screen.getByText("View Subscription Plans"));

    expect(mockPush).toHaveBeenCalledWith("/subscription-plans");
  });

  it("shows renewal and cancellation terms on the dedicated plan screen", () => {
    renderWithProviders(<SubscriptionPlansScreen />);

    expect(
      screen.getAllByText(/renew automatically until cancelled/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("The Heirloom")).toBeTruthy();
    expect(screen.getByText("The Steward")).toBeTruthy();
    expect(screen.getByText("Save 46% vs monthly")).toBeTruthy();
    expect(screen.getByText(/Cancel at least 24 hours before/i)).toBeTruthy();
    expect(screen.getByText("Restore purchases")).toBeTruthy();
    expect(screen.getByText("Terms")).toBeTruthy();
    expect(screen.getByText("Privacy")).toBeTruthy();
  });
});

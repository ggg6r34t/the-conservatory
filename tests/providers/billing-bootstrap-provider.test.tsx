import React from "react";

import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { useBillingStore } from "@/features/billing/stores/useBillingStore";
import { BillingBootstrapProvider } from "@/providers/BillingBootstrapProvider";

const mockInitialize = jest.fn();
const mockGetSubscriptionState = jest.fn();
const mockGetOfferings = jest.fn();
const mockSetSubscriptionStateListener = jest.fn();
const mockReadEntitlementCache = jest.fn();
const mockWriteEntitlementCache = jest.fn();
const mockClearEntitlementCache = jest.fn();
const mockSetEntitlementState = jest.fn();
const mockRetryDeferredPremiumPhotoBackups = jest.fn();
const mockInitializeAnalytics = jest.fn();
const mockResetAnalyticsUser = jest.fn();
const mockTrackMonetizationEvent = jest.fn();

let mockAuthState = {
  user: { id: "user-1" },
  isAuthenticated: true,
};

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

jest.mock("@/features/billing/services/billingClient", () => ({
  billingClient: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    getSubscriptionState: (...args: unknown[]) =>
      mockGetSubscriptionState(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
    setSubscriptionStateListener: (...args: unknown[]) =>
      mockSetSubscriptionStateListener(...args),
  },
}));

jest.mock("@/features/billing/services/entitlementCache", () => ({
  readEntitlementCache: (...args: unknown[]) =>
    mockReadEntitlementCache(...args),
  writeEntitlementCache: (...args: unknown[]) =>
    mockWriteEntitlementCache(...args),
  clearEntitlementCache: (...args: unknown[]) =>
    mockClearEntitlementCache(...args),
  resolveEffectiveTier: (entry: { tier: string; expiresAt: string | null }) => {
    if (entry.tier !== "premium") return "free";
    if (!entry.expiresAt) return "premium";
    return new Date(entry.expiresAt) > new Date() ? "premium" : "free";
  },
}));

jest.mock("@/services/entitlementState", () => ({
  setEntitlementState: (...args: unknown[]) => mockSetEntitlementState(...args),
}));

jest.mock("@/services/database/photoBackupRetry", () => ({
  retryDeferredPremiumPhotoBackups: (...args: unknown[]) =>
    mockRetryDeferredPremiumPhotoBackups(...args),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  initializeAnalytics: (...args: unknown[]) => mockInitializeAnalytics(...args),
  resetAnalyticsUser: (...args: unknown[]) => mockResetAnalyticsUser(...args),
  trackMonetizationEvent: (...args: unknown[]) =>
    mockTrackMonetizationEvent(...args),
  trackGtmEvent: jest.fn(),
}));

const premiumState = {
  tier: "premium" as const,
  expiresAt: "2027-05-07T00:00:00.000Z",
  period: "annual" as const,
};

describe("BillingBootstrapProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      user: { id: "user-1" },
      isAuthenticated: true,
    };
    useBillingStore.setState({
      tier: "free",
      isLoading: true,
      isRestoring: false,
      expiresAt: null,
      period: null,
      error: null,
      offerings: null,
    });
    mockReadEntitlementCache.mockResolvedValue(null);
    mockInitialize.mockResolvedValue(undefined);
    mockGetSubscriptionState.mockResolvedValue({
      tier: "free",
      expiresAt: null,
      period: null,
    });
    mockGetOfferings.mockResolvedValue(null);
    mockWriteEntitlementCache.mockResolvedValue(undefined);
    mockClearEntitlementCache.mockResolvedValue(undefined);
    mockRetryDeferredPremiumPhotoBackups.mockResolvedValue(undefined);
    mockSetSubscriptionStateListener.mockReturnValue(jest.fn());
  });

  it("propagates RevenueCat customer-info updates to store, entitlement cache, and photo retry", async () => {
    const listeners: ((state: typeof premiumState) => void)[] = [];
    mockSetSubscriptionStateListener.mockImplementation((callback) => {
      listeners.push(callback);
      return jest.fn();
    });

    const rendered = render(
      <BillingBootstrapProvider>
        <Text>child</Text>
      </BillingBootstrapProvider>,
    );

    await waitFor(() => {
      expect(mockSetSubscriptionStateListener).toHaveBeenCalled();
    });

    expect(listeners).toHaveLength(1);
    listeners[0](premiumState);

    await waitFor(() => {
      expect(useBillingStore.getState().tier).toBe("premium");
      expect(mockSetEntitlementState).toHaveBeenLastCalledWith(true);
      expect(mockWriteEntitlementCache).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "premium",
          expiresAt: premiumState.expiresAt,
          period: "annual",
        }),
      );
      expect(mockRetryDeferredPremiumPhotoBackups).toHaveBeenCalledWith(
        "user-1",
      );
    });

    rendered.unmount();
  });

  it("preserves valid cached premium entitlement when RevenueCat state fetch fails", async () => {
    mockReadEntitlementCache.mockResolvedValue({
      ...premiumState,
      lastVerifiedAt: "2026-05-07T00:00:00.000Z",
    });
    mockGetSubscriptionState.mockRejectedValue(new Error("network offline"));

    render(
      <BillingBootstrapProvider>
        <Text>child</Text>
      </BillingBootstrapProvider>,
    );

    await waitFor(() => {
      const storeState = useBillingStore.getState();
      expect(storeState.tier).toBe("premium");
      expect(storeState.isLoading).toBe(false);
      expect(mockSetEntitlementState).toHaveBeenCalledWith(true);
    });

    expect(mockSetEntitlementState).not.toHaveBeenLastCalledWith(false);
    expect(mockTrackMonetizationEvent).toHaveBeenCalledWith(
      "billing_initialization_failed",
      expect.objectContaining({ reason: "network offline" }),
    );
  });

  it("clears entitlement cache and analytics identity on logout", async () => {
    mockAuthState = {
      user: { id: "user-1" },
      isAuthenticated: false,
    };

    render(
      <BillingBootstrapProvider>
        <Text>child</Text>
      </BillingBootstrapProvider>,
    );

    await waitFor(() => {
      expect(mockClearEntitlementCache).toHaveBeenCalled();
      expect(mockResetAnalyticsUser).toHaveBeenCalled();
      expect(useBillingStore.getState().tier).toBe("free");
      expect(mockSetEntitlementState).toHaveBeenCalledWith(false);
    });
  });
});

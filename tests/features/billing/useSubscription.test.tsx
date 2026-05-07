import { act, renderHook } from "@testing-library/react-native";

const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();
const mockGetSubscriptionState = jest.fn();
const mockGetOfferings = jest.fn();
const mockSetEntitlementState = jest.fn();
const mockWriteEntitlementCache = jest.fn();
const mockRetryDeferredPremiumPhotoBackups = jest.fn();
const mockTrackMonetizationEvent = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/features/billing/services/billingClient", () => ({
  billingClient: {
    purchasePackage: (...args: unknown[]) => mockPurchasePackage(...args),
    restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
    getSubscriptionState: (...args: unknown[]) =>
      mockGetSubscriptionState(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
  },
}));

jest.mock("@/services/entitlementState", () => ({
  setEntitlementState: (...args: unknown[]) => mockSetEntitlementState(...args),
}));

jest.mock("@/features/billing/services/entitlementCache", () => ({
  writeEntitlementCache: (...args: unknown[]) =>
    mockWriteEntitlementCache(...args),
}));

jest.mock("@/services/database/photoBackupRetry", () => ({
  retryDeferredPremiumPhotoBackups: (...args: unknown[]) =>
    mockRetryDeferredPremiumPhotoBackups(...args),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackMonetizationEvent: (...args: unknown[]) =>
    mockTrackMonetizationEvent(...args),
}));

describe("useSubscription entitlement propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSubscriptionState.mockResolvedValue({
      tier: "premium",
      expiresAt: "2026-06-07T00:00:00.000Z",
      period: "annual",
    });
    mockPurchasePackage.mockResolvedValue({ success: true, tier: "premium" });
    mockRestorePurchases.mockResolvedValue({ success: true, tier: "premium" });
    mockGetOfferings.mockResolvedValue(null);

    const {
      useBillingStore,
    } = require("@/features/billing/stores/useBillingStore");
    useBillingStore.setState({
      tier: "free",
      isLoading: false,
      isRestoring: false,
      expiresAt: null,
      period: null,
      error: null,
      offerings: null,
    });
  });

  it("propagates purchase success to entitlement state, cache, and deferred photo retry", async () => {
    const {
      useSubscription,
    } = require("@/features/billing/hooks/useSubscription");
    const { result } = renderHook(() => useSubscription());

    await act(async () => {
      await result.current.purchase("$rc_annual");
    });

    expect(mockSetEntitlementState).toHaveBeenCalledWith(true);
    expect(mockWriteEntitlementCache).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "premium",
        expiresAt: "2026-06-07T00:00:00.000Z",
        period: "annual",
        lastVerifiedAt: expect.any(String),
      }),
    );
    expect(mockRetryDeferredPremiumPhotoBackups).toHaveBeenCalledWith("user-1");
    expect(result.current.isPremium).toBe(true);
  });

  it("propagates restore success to entitlement state, cache, and deferred photo retry", async () => {
    const {
      useSubscription,
    } = require("@/features/billing/hooks/useSubscription");
    const { result } = renderHook(() => useSubscription());

    await act(async () => {
      await result.current.restore();
    });

    expect(mockSetEntitlementState).toHaveBeenCalledWith(true);
    expect(mockWriteEntitlementCache).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "premium",
        expiresAt: "2026-06-07T00:00:00.000Z",
        period: "annual",
      }),
    );
    expect(mockRetryDeferredPremiumPhotoBackups).toHaveBeenCalledWith("user-1");
    expect(result.current.isPremium).toBe(true);
  });

  it("does not refresh entitlements or mark completion when restore fails", async () => {
    mockRestorePurchases.mockResolvedValueOnce({
      success: false,
      tier: "free",
      error: "No purchases found",
    });
    const {
      useSubscription,
    } = require("@/features/billing/hooks/useSubscription");
    const { result } = renderHook(() => useSubscription());

    let restoreResult;
    await act(async () => {
      restoreResult = await result.current.restore();
    });

    expect(restoreResult).toEqual(
      expect.objectContaining({
        success: false,
        error: "No purchases found",
      }),
    );
    expect(mockGetSubscriptionState).not.toHaveBeenCalled();
    expect(mockSetEntitlementState).not.toHaveBeenCalled();
    expect(mockWriteEntitlementCache).not.toHaveBeenCalled();
    expect(result.current.error).toBe("No purchases found");
    expect(mockTrackMonetizationEvent).toHaveBeenCalledWith(
      "restore_failed",
      expect.objectContaining({ reason: "No purchases found" }),
    );
  });

  it("tracks offerings load failure when no offering payload is available", async () => {
    mockGetOfferings.mockResolvedValueOnce(null);
    const {
      useSubscription,
    } = require("@/features/billing/hooks/useSubscription");
    const { result } = renderHook(() => useSubscription());

    await act(async () => {
      await result.current.refreshOfferings();
    });

    expect(mockTrackMonetizationEvent).toHaveBeenCalledWith(
      "offerings_load_failed",
      expect.objectContaining({ reason: "empty_or_unavailable" }),
    );
  });
});

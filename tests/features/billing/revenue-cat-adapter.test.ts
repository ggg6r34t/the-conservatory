const mockConfigure = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn();
const mockAddCustomerInfoUpdateListener = jest.fn();
const mockRemoveCustomerInfoUpdateListener = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: { RNPurchases: {} },
}));

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    setLogLevel: jest.fn(),
    getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
    addCustomerInfoUpdateListener: (...args: unknown[]) =>
      mockAddCustomerInfoUpdateListener(...args),
    removeCustomerInfoUpdateListener: (...args: unknown[]) =>
      mockRemoveCustomerInfoUpdateListener(...args),
  },
  LOG_LEVEL: { DEBUG: "DEBUG" },
  PACKAGE_TYPE: {
    ANNUAL: "ANNUAL",
    MONTHLY: "MONTHLY",
    LIFETIME: "LIFETIME",
  },
}));

function customerInfo(
  productIdentifier: string,
  expirationDate: string | null,
) {
  return {
    entitlements: {
      active: {
        premium: {
          expirationDate,
          productIdentifier,
        },
      },
    },
  };
}

describe("RevenueCatAdapter", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_RC_API_KEY_IOS = "appl_test";
    process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID = "goog_test";
    process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM = "premium";
  });

  it("derives annual period from the active entitlement product identifier", async () => {
    mockGetCustomerInfo.mockResolvedValue(
      customerInfo("conservatory_premium_annual", "2027-05-07T00:00:00.000Z"),
    );
    const {
      RevenueCatAdapter,
    } = require("@/features/billing/adapters/RevenueCatAdapter");
    const adapter = new RevenueCatAdapter();

    await adapter.initialize("user-1");
    const state = await adapter.getSubscriptionState();

    expect(state).toEqual(
      expect.objectContaining({
        tier: "premium",
        period: "annual",
        expiresAt: "2027-05-07T00:00:00.000Z",
      }),
    );
  });

  it("resolves offerings from configured offering id when current is missing", async () => {
    mockGetOfferings.mockResolvedValue({
      current: null,
      all: {
        default: {
          identifier: "default",
          availablePackages: [
            {
              identifier: "$rc_monthly",
              packageType: "MONTHLY",
              product: {
                identifier: "conservatory_premium_monthly",
                priceString: "$6.99",
                pricePerMonthString: "$6.99",
                introPrice: null,
              },
            },
            {
              identifier: "$rc_annual",
              packageType: "ANNUAL",
              product: {
                identifier: "conservatory_premium_annual",
                priceString: "$44.99",
                pricePerMonthString: "$3.75",
                introPrice: null,
              },
            },
          ],
          monthly: null,
          annual: null,
          lifetime: null,
        },
      },
    });

    const {
      RevenueCatAdapter,
    } = require("@/features/billing/adapters/RevenueCatAdapter");
    const adapter = new RevenueCatAdapter();

    await adapter.initialize("user-1");
    const offering = await adapter.getOfferings();

    expect(offering?.identifier).toBe("default");
    expect(offering?.monthly?.productIdentifier).toBe(
      "conservatory_premium_monthly",
    );
    expect(offering?.annual?.productIdentifier).toBe(
      "conservatory_premium_annual",
    );
  });

  it("throws RevenueCat customer info errors instead of converting them to free", async () => {
    mockGetCustomerInfo.mockRejectedValue(new Error("RevenueCat unavailable"));
    const {
      RevenueCatAdapter,
    } = require("@/features/billing/adapters/RevenueCatAdapter");
    const adapter = new RevenueCatAdapter();

    await adapter.initialize("user-1");

    await expect(adapter.getSubscriptionState()).rejects.toThrow(
      /RevenueCat unavailable/i,
    );
  });

  it("maps customer-info update listener payloads to subscription state and cleans up", async () => {
    const listeners: ((info: unknown) => void)[] = [];
    mockAddCustomerInfoUpdateListener.mockImplementation((callback) => {
      listeners.push(callback);
    });
    const onUpdate = jest.fn();
    const {
      RevenueCatAdapter,
    } = require("@/features/billing/adapters/RevenueCatAdapter");
    const adapter = new RevenueCatAdapter();

    await adapter.initialize("user-1");
    const cleanup = adapter.setSubscriptionStateListener(onUpdate);
    expect(listeners).toHaveLength(1);
    listeners[0](
      customerInfo("conservatory_premium_monthly", "2026-06-07T00:00:00.000Z"),
    );
    cleanup();

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "premium",
        period: "monthly",
      }),
    );
    expect(mockRemoveCustomerInfoUpdateListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});

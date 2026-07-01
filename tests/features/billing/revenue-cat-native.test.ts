describe("revenueCatNative", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("returns false when the native purchases bridge is missing", () => {
    jest.doMock("react-native", () => ({
      Platform: { OS: "android" },
      NativeModules: {},
    }));

    const {
      isRevenueCatNativeAvailable,
    } = require("@/features/billing/services/revenueCatNative");

    expect(isRevenueCatNativeAvailable()).toBe(false);
  });

  it("returns true when RNPurchases is linked", () => {
    jest.doMock("react-native", () => ({
      Platform: { OS: "ios" },
      NativeModules: { RNPurchases: {} },
    }));

    const {
      isRevenueCatNativeAvailable,
    } = require("@/features/billing/services/revenueCatNative");

    expect(isRevenueCatNativeAvailable()).toBe(true);
  });
});

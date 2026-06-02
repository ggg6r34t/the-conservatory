import { canUseFeature } from "@/features/billing/services/entitlementService";

describe("advanced_library_filters entitlement", () => {
  it("requires premium before advanced library filters can be used", () => {
    const usage = {
      totalPlantCount: 2,
      progressPhotosForPlant: {},
      aiHealthInsightsThisMonth: {},
      plantIdThisMonth: 0,
    };

    expect(
      canUseFeature("advanced_library_filters", false, usage).canUse,
    ).toBe(false);
    expect(
      canUseFeature("advanced_library_filters", true, usage).canUse,
    ).toBe(true);
  });
});

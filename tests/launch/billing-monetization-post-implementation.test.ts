import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Billing monetization post-implementation certification", () => {
  it("centralizes editorial membership names", () => {
    expect(read("features/billing/membershipNames.ts")).toContain(
      "The Seedling",
    );
    expect(read("features/billing/membershipNames.ts")).toContain(
      "The Steward",
    );
    expect(read("features/billing/membershipNames.ts")).toContain(
      "The Heirloom",
    );
    expect(read("app/premium.tsx")).toContain("getMembershipName");
    expect(read("app/profile.tsx")).toContain("getMembershipName");
    expect(read("app/subscription-plans.tsx")).toContain(
      "getMembershipNameForPackageType",
    );
  });

  it("resolves store product ids and offering fallbacks", () => {
    expect(read("features/billing/constants.ts")).toContain(
      "conservatory_premium_monthly",
    );
    expect(read("features/billing/services/offeringPackageResolution.ts")).toContain(
      "resolvePremiumOfferingPackages",
    );
    expect(read("features/billing/services/purchasesOfferingSelection.ts")).toContain(
      "resolvePurchasesOffering",
    );
    expect(read("features/billing/adapters/RevenueCatAdapter.ts")).toContain(
      "buildBillingOffering",
    );
    expect(read("features/billing/adapters/RevenueCatAdapter.ts")).toContain(
      "resolvePurchasesOffering",
    );
  });

  it("surfaces annual savings copy on the plan picker", () => {
    expect(read("features/billing/services/subscriptionPricingCopy.ts")).toContain(
      "formatAnnualSavingsLabel",
    );
    expect(read("app/subscription-plans.tsx")).toContain("formatAnnualSavingsLabel");
  });

  it("defers lifetime in launch offerings resolution", () => {
    expect(read("features/billing/services/offeringPackageResolution.ts")).toContain(
      "lifetime: null",
    );
    expect(read("app/subscription-plans.tsx")).not.toContain("lifetimePkg");
  });

  it("avoids broad unlimited-ai marketing on profile subscription card", () => {
    const profile = read("app/profile.tsx");
    expect(profile).not.toContain("unlimited AI insights");
    expect(profile).toContain("AI journal narratives");
  });
});

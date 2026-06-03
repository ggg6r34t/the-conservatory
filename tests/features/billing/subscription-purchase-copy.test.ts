import { buildSubscriptionPurchaseConfirmMessage } from "@/features/billing/services/subscriptionPurchaseCopy";
import type { BillingPackage } from "@/features/billing/types";

const annualPackage: BillingPackage = {
  identifier: "$rc_annual",
  packageType: "annual",
  priceString: "$44.99",
  pricePerMonthString: "$3.75",
  productIdentifier: "conservatory_premium_annual",
  introductoryPrice: "7-day free trial",
};

describe("buildSubscriptionPurchaseConfirmMessage", () => {
  it("includes plan price, trial, and store confirmation note", () => {
    const message = buildSubscriptionPurchaseConfirmMessage(annualPackage);

    expect(message).toContain("7-day free trial");
    expect(message).toContain("$44.99/year");
    expect(message).toContain("renews automatically");
    expect(message).toContain("confirmation");
  });
});

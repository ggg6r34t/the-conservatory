import { Platform } from "react-native";

import { getMembershipNameForPackageType } from "@/features/billing/membershipNames";
import type { BillingPackage } from "@/features/billing/types";

export function buildSubscriptionPurchaseConfirmMessage(
  selectedPackage: BillingPackage,
): string {
  const planName =
    getMembershipNameForPackageType(selectedPackage.packageType) ??
    "Premium membership";
  const billingPeriod =
    selectedPackage.packageType === "annual"
      ? "year"
      : selectedPackage.packageType === "monthly"
        ? "month"
        : "billing period";
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";
  const trialLine = selectedPackage.introductoryPrice
    ? `${selectedPackage.introductoryPrice}, then `
    : "";

  return [
    `${trialLine}${selectedPackage.priceString}/${billingPeriod} renews automatically until you cancel.`,
    `Payment is charged to your ${storeName} account.`,
    `You may see a brief ${storeName} confirmation before ${planName} activates.`,
  ].join(" ");
}

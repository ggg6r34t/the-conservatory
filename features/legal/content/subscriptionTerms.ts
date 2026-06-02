import { LEGAL_CONTACT } from "@/features/legal/constants";
import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export const subscriptionTermsSections: LegalSection[] = [
  {
    eyebrow: "PLANS",
    title: "Available subscriptions",
    paragraphs: [
      "Premium is offered as monthly and/or annual auto-renewing subscriptions. Plan names, prices, currency, and any free trial length are displayed in the app before you confirm purchase and may vary by region or store listing.",
      "Feature availability may change over time, but your collection data remains yours regardless of subscription status.",
    ],
  },
  {
    eyebrow: "FREE TRIALS",
    title: "Introductory offers",
    paragraphs: [
      "If a free trial is offered for your selected plan, the trial length and price after the trial are shown on the subscription screen before purchase.",
      "Unless you cancel before the trial ends, the trial converts to a paid subscription and your store account is charged at the then-current price for the selected plan.",
      "Trial eligibility is determined by Apple or Google and may be limited to new subscribers.",
    ],
  },
  {
    eyebrow: "RENEWAL",
    title: "Automatic renewal",
    paragraphs: [
      "Subscriptions renew automatically at the end of each billing period unless cancelled at least 24 hours before the current period ends.",
      "Your store account is charged within 24 hours prior to the start of each renewal period at the price shown in your store subscription settings.",
    ],
  },
  {
    eyebrow: "CANCELLATION",
    title: "How to cancel",
    paragraphs: [
      "You may cancel anytime through your Apple App Store or Google Play subscription settings. Cancellation stops future renewals; you retain Premium access until the end of the current paid period unless otherwise required by store policy.",
      "Deleting The Conservatory app does not cancel your subscription. Manage subscriptions in your platform account.",
    ],
  },
  {
    eyebrow: "RESTORE",
    title: "Restore purchases",
    paragraphs: [
      "If you reinstall the app or switch devices, use Restore Purchases on the Subscription Plans screen while signed in with the same store account used for the original purchase.",
      "Restored entitlements depend on Apple or Google purchase records and RevenueCat validation.",
    ],
  },
  {
    eyebrow: "REFUNDS",
    title: "Store-managed refunds",
    paragraphs: [
      "Payments, refunds, and billing disputes are handled by Apple or Google according to their policies. We do not process refunds directly.",
      "To request a refund, use the refund workflow provided by your platform store.",
    ],
  },
  {
    eyebrow: "PRICE CHANGES",
    title: "Changes to pricing",
    paragraphs: [
      "Subscription prices may change in the future. If a price increase applies to your subscription, your platform store will notify you according to its rules and may require your consent before the new price takes effect.",
    ],
  },
  {
    eyebrow: "DOWNGRADES",
    title: "When Premium ends",
    paragraphs: [
      "When Premium expires or is cancelled, Premium-only features such as full photo cloud backup, advanced AI quotas, enhanced export, and certain library filters may become unavailable. Your existing collection data remains on your device and in cloud sync where already stored, subject to your account and sync settings.",
      "See the After Premium screen in the app for a feature-level summary.",
    ],
  },
  {
    eyebrow: "BILLING SUPPORT",
    title: "Contact",
    paragraphs: [
      `Subscription questions: ${LEGAL_CONTACT.supportEmail}. For store billing receipts and refunds, contact Apple or Google support directly.`,
    ],
  },
];

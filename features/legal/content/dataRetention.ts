import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export const dataRetentionSections: LegalSection[] = [
  {
    eyebrow: "ACTIVE ACCOUNTS",
    title: "While you use the app",
    paragraphs: [
      "Collection data, preferences, reminders, and synced cloud copies are retained while your account is active and you use the service.",
      "Cached entitlement and AI response data on your device may persist until cleared by the app, account deletion, or cache expiry.",
    ],
  },
  {
    eyebrow: "LOCAL DATA",
    title: "On your device",
    paragraphs: [
      "Local SQLite data, photos, drafts, and exports remain on your device until you delete them, delete your account through the app, or uninstall the app.",
      "Uninstalling the app without exporting may permanently remove local-only data that was never synced.",
    ],
  },
  {
    eyebrow: "CLOUD DATA",
    title: "Supabase records",
    paragraphs: [
      "When cloud sync is enabled, collection tables and auth profile data are stored in Supabase until you delete your account or we delete data in accordance with this policy.",
      "Premium photo objects in Supabase Storage remain until deleted through account deletion workflows or manual cleanup. Database row deletion does not automatically guarantee immediate removal of every storage object from all backup tiers.",
    ],
  },
  {
    eyebrow: "BILLING RECORDS",
    title: "Subscription history",
    paragraphs: [
      "Apple, Google, and RevenueCat retain purchase history according to their own policies. We retain entitlement verification timestamps and cached tier state as needed to provide Premium features.",
    ],
  },
  {
    eyebrow: "ANALYTICS RETENTION",
    title: "Product events",
    paragraphs: [
      "PostHog event data, when collected, is retained according to our PostHog project configuration and provider policies.",
    ],
  },
  {
    eyebrow: "LEGAL RETENTION",
    title: "When we keep data longer",
    paragraphs: [
      "We may retain limited records longer where necessary for fraud prevention, security investigations, dispute resolution, or legal compliance.",
    ],
  },
];

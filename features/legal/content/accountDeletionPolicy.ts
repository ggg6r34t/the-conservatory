import { LEGAL_CONTACT } from "@/features/legal/constants";
import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export const accountDeletionSections: LegalSection[] = [
  {
    eyebrow: "HOW TO DELETE",
    title: "In-app steps",
    paragraphs: [
      "Open Profile → Privacy & Security → Delete Account. You must confirm the destructive action in the dialog.",
      "Deleting your account does not automatically cancel an active App Store or Google Play subscription. Cancel billing separately in your platform subscription settings.",
    ],
  },
  {
    eyebrow: "CLOUD DELETION",
    title: "When Supabase is configured",
    paragraphs: [
      "The app invokes our delete-account edge function, which deletes your Supabase Auth user. Database rows tied to your user ID are removed through foreign-key cascade, including plants, photos metadata, care logs, reminders, preferences, and related synced tables.",
      "After remote deletion succeeds, the app clears local collection data and signs you out.",
    ],
  },
  {
    eyebrow: "LOCAL DELETION",
    title: "On-device wipe",
    paragraphs: [
      "The app deletes local SQLite collection tables, sync queue entries, preferences, and user profile rows stored on the device as part of account deletion.",
      "Session tokens, plant drafts, and onboarding flags are cleared. Some non-collection caches may remain until overwritten or until you remove the app.",
    ],
  },
  {
    eyebrow: "STORAGE FILES",
    title: "Photos and backups",
    paragraphs: [
      "Local photo files in the app sandbox are removed as part of clearing local collection data where applicable.",
      "Cloud photo objects in Supabase Storage may not be deleted instantly by the auth deletion flow alone. Residual storage objects, if any, are purged according to provider backup and lifecycle practices.",
    ],
  },
  {
    eyebrow: "LOCAL-ONLY BUILDS",
    title: "Without cloud backend",
    paragraphs: [
      "Development or offline builds without Supabase skip remote deletion and remove local account data and session state only.",
    ],
  },
  {
    eyebrow: "DELETION TIMING",
    title: "Processing window",
    paragraphs: [
      "Account deletion begins immediately when you confirm. Cloud auth deletion is typically completed within minutes, but provider backups or replication may retain deleted data for up to approximately 30 days before automatic purge.",
      "Analytics or billing records held by Apple, Google, RevenueCat, or PostHog are governed by those providers' retention schedules.",
      `If deletion fails or you need confirmation, contact ${LEGAL_CONTACT.privacyEmail}.`,
    ],
  },
];

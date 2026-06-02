import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export const privacySecuritySections: LegalSection[] = [
  {
    eyebrow: "LOCAL STORAGE",
    title: "SQLite and on-device files",
    paragraphs: [
      "Plant records, care logs, reminders, photos metadata, and related tables are stored in a local SQLite database on your device.",
      "Photo files and export files are stored in the app sandbox on your device. Other apps cannot access this data without device-level compromise.",
    ],
  },
  {
    eyebrow: "AUTHENTICATION",
    title: "Sessions and credentials",
    paragraphs: [
      "When cloud sign-in is enabled, Supabase Auth manages your account credentials. Session tokens are stored using Expo SecureStore, not plain AsyncStorage.",
      "Local development builds without Supabase may use local-only credentials stored in SQLite for testing; those builds are not intended for production release.",
    ],
  },
  {
    eyebrow: "ENCRYPTION",
    title: "In transit and at rest",
    paragraphs: [
      "Communication with Supabase, RevenueCat, and analytics services uses encrypted HTTPS/TLS.",
      "Device storage benefits from operating-system protections available on your phone or tablet. We do not implement a separate user-managed encryption passphrase for your collection.",
    ],
  },
  {
    eyebrow: "SYNC",
    title: "Cloud sync and queue integrity",
    paragraphs: [
      "When auto-sync is enabled, local changes are written to a sync queue and replayed to Supabase when online. The local database remains the source of truth during normal operation.",
      "Sync diagnostics in Backup Details show queue status honestly, including deferred or abandoned items when applicable.",
    ],
  },
  {
    eyebrow: "BACKUP",
    title: "Premium photo backup",
    paragraphs: [
      "Premium subscribers may back up plant photos to Supabase Storage when sync runs successfully. Free accounts may keep photos on device only.",
      "Backup status reflects actual sync outcomes; the app does not claim backup completeness when uploads are deferred or unavailable.",
    ],
  },
  {
    eyebrow: "NOTIFICATIONS",
    title: "Reminders without remote push",
    paragraphs: [
      "Care reminders use local scheduled notifications on your device. The app does not register an Expo push token or send remote push campaigns in the current release.",
    ],
  },
  {
    eyebrow: "TELEMETRY",
    title: "Product analytics",
    paragraphs: [
      "In production builds with PostHog configured, limited product analytics may be collected to understand feature usage and reliability. Analytics do not include the contents of your care notes or photos.",
    ],
  },
  {
    eyebrow: "SECURITY LIMITS",
    title: "What we cannot guarantee",
    paragraphs: [
      "No security program prevents all unauthorized access, device loss, or user error. Protect your device passcode, store account credentials, and maintain your own export copies for important records.",
    ],
  },
];

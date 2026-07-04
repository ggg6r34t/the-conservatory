import { LEGAL_CONTACT } from "@/features/legal/constants";
import { accountDeletionSections } from "@/features/legal/content/accountDeletionPolicy";
import { dataExportSections } from "@/features/legal/content/dataExportPolicy";
import { dataRetentionSections } from "@/features/legal/content/dataRetention";
import { privacySecuritySections } from "@/features/legal/content/privacySecurityStatement";
import type { LegalDocumentConfig } from "@/features/legal/types";

export const privacyPolicyDocument: LegalDocumentConfig = {
  title: "Privacy Policy",
  subtitle: "Data stewardship",
  description:
    "How The Conservatory collects, uses, stores, protects, exports, and deletes your information.",
  prefaceLabel: "PRIVACY POLICY",
  prefaceTitle: "Your botanical archive, your control",
  prefaceBody:
    "The Conservatory is a local-first plant care app. You may use core collection features without creating an account; data stays on your device until you sign up and enable cloud backup. When you sign in and enable cloud features, selected data may sync to our backend so you can restore it across sessions or devices.",
  sections: [
    {
      eyebrow: "LOCAL USE",
      title: "Using the app without an account",
      paragraphs: [
        "You can add plants, care logs, photos, and reminders on this device without signing in. That local data remains on your device and is not backed up to our servers until you create an account and enable cloud sync.",
        "Deleting the app or clearing local data may permanently remove local-only collections that were never synced.",
      ],
    },
    {
      eyebrow: "DATA WE COLLECT",
      title: "Information you provide",
      paragraphs: [
        "Account information such as email address, display name, and profile photo when you create or update an account.",
        "Collection content you enter or upload, including plant names, species, locations, care logs, notes, reminders, memorial and graveyard entries, specimen tags, and photos.",
        "Preferences such as theme, timezone, default watering hour, reminder settings, and auto-sync preferences.",
      ],
    },
    {
      eyebrow: "AUTOMATIC DATA",
      title: "Technical and usage information",
      paragraphs: [
        "Device platform (iOS, Android, or web), app interactions needed to operate core features, sync queue status, and diagnostic information when something fails.",
        "In production builds where configured, we use PostHog to collect product analytics events such as onboarding steps, subscription actions, and feature usage. Analytics are tied to your account identifier when you are signed in.",
        "We do not collect precise GPS location in the app. Plant location fields are free-text labels you choose to enter.",
      ],
    },
    {
      eyebrow: "SUBSCRIPTION DATA",
      title: "Billing and entitlement information",
      paragraphs: [
        "Subscription purchases are processed by Apple or Google. RevenueCat helps us validate Premium entitlement status, renewal dates, and restore purchases. We do not receive or store your full payment card number.",
        "We may store subscription tier, verification timestamps, and cached entitlement state on your device to keep Premium features available offline.",
      ],
    },
    {
      eyebrow: "AI PROCESSING",
      title: "When cloud assistance is used",
      paragraphs: [
        "Many AI features run locally on your device from your care history. When Premium and cloud AI are enabled, selected plant metadata, care notes, photo references, and locally generated summaries may be sent to our Supabase edge functions for processing.",
        "The app does not currently send your data to third-party large language model providers such as OpenAI or Anthropic. Cloud AI responses may use prepared fallbacks or server-side logic configured for the service.",
        "See the AI Disclosure Policy for limitations and your responsibilities.",
      ],
    },
    {
      eyebrow: "WHY WE USE DATA",
      title: "Purposes of processing",
      paragraphs: [
        "Provide account access, collection management, reminders, exports, imports, memorial features, and Premium capabilities you choose to use.",
        "Sync and back up collection data when cloud services are enabled.",
        "Validate subscriptions, enforce usage limits, maintain security, troubleshoot errors, and improve reliability.",
        "Comply with law, respond to lawful requests, and enforce our terms.",
      ],
    },
    {
      eyebrow: "LEGAL BASES",
      title: "GDPR and UK GDPR",
      paragraphs: [
        "Where GDPR or UK GDPR applies, we rely on: (1) performance of a contract to provide the app and Premium features you request; (2) legitimate interests in securing, improving, and operating the service, balanced against your rights; (3) consent where required for optional permissions such as camera, photo library, or notifications; and (4) legal obligation where we must retain or disclose information.",
        "You may withdraw consent for optional permissions in device settings. Withdrawal does not affect processing already performed.",
      ],
    },
    {
      eyebrow: "STORAGE",
      title: "Where data is kept",
      paragraphs: [
        "On device: SQLite database (primary local store), AsyncStorage (drafts, caches, onboarding flags), SecureStore (session tokens), and local photo files.",
        "In cloud (when configured and enabled): Supabase PostgreSQL for synced collection tables, Supabase Storage for Premium photo backup, and Supabase Auth for account credentials.",
        "Analytics events may be processed by PostHog in the United States or the region configured for your PostHog project.",
      ],
    },
    {
      eyebrow: "SHARING",
      title: "Subprocessors and disclosures",
      paragraphs: [
        "We do not sell your personal information. We share information only with service providers that help us operate the app, with platform stores for billing, or when required by law.",
        "Current subprocessors include, where configured: Supabase (authentication, database, storage, edge functions), RevenueCat (subscription management), PostHog (analytics), Expo/React Native platform services, and Apple App Store or Google Play for payments.",
      ],
    },
    {
      eyebrow: "INTERNATIONAL TRANSFERS",
      title: "Cross-border processing",
      paragraphs: [
        "If you use the app outside the United States, your information may be processed in the United States or other countries where our providers operate. We rely on appropriate safeguards such as standard contractual clauses where required.",
      ],
    },
    ...privacySecuritySections,
    ...dataRetentionSections,
    ...dataExportSections,
    ...accountDeletionSections,
    {
      eyebrow: "YOUR RIGHTS",
      title: "Access, correction, deletion, and portability",
      paragraphs: [
        "Depending on your location, you may have rights to access, correct, delete, restrict, object to, or port your personal information.",
        "You can update profile information in the app, export collection data from Data & Backup or Privacy & Security, and delete your account from Privacy & Security.",
        `To exercise privacy rights, contact ${LEGAL_CONTACT.privacyEmail}. We may need to verify your identity before responding.`,
      ],
    },
    {
      eyebrow: "CHILDREN",
      title: "Minors",
      paragraphs: [
        "The Conservatory is not directed to children under 13, and we do not knowingly collect personal information from children under 13. Contact us if you believe a child has provided personal information.",
      ],
    },
    {
      eyebrow: "CALIFORNIA",
      title: "CCPA/CPRA notice",
      paragraphs: [
        "California residents: we do not sell or share personal information for cross-context behavioral advertising. You may request access, deletion, or correction as described above.",
      ],
    },
    {
      eyebrow: "CHANGES",
      title: "Updates to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. Material changes will be reflected in the app and by updating the effective date below.",
        `Privacy questions: ${LEGAL_CONTACT.privacyEmail}.`,
      ],
    },
  ],
};

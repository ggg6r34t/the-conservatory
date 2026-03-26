import {
  LegalDocumentScreen,
  type LegalSection,
} from "@/features/profile/components/LegalDocumentScreen";

const sections: LegalSection[] = [
  {
    eyebrow: "INFORMATION YOU PROVIDE",
    title: "Account and collection details",
    paragraphs: [
      "When you create an account or use The Conservatory, you may provide information such as your name, email address, profile details, plant records, care logs, notes, memorial entries, reminders, and photos.",
      "If you choose to sync your archive or use cloud-backed features, this information may be stored with connected service providers so it can be restored across sessions or devices.",
    ],
  },
  {
    eyebrow: "AUTOMATIC INFORMATION",
    title: "Technical and usage data",
    paragraphs: [
      "We may collect limited technical information needed to operate the app, such as device type, app version, crash data, sync status, and basic diagnostic signals.",
      "Where enabled, we may also collect aggregated or de-identified usage information to help improve reliability, feature quality, and plant-care tools.",
    ],
  },
  {
    eyebrow: "HOW WE USE DATA",
    title: "Operating and improving the service",
    paragraphs: [
      "We use your information to provide core app functions, including account access, collection management, reminders, syncing, backups, and support for features you choose to use.",
      "We may also use information to maintain security, prevent abuse, troubleshoot problems, improve performance, and communicate important service or policy updates.",
    ],
  },
  {
    eyebrow: "SHARING AND DISCLOSURE",
    title: "When information may be shared",
    paragraphs: [
      "We do not sell your personal information. We may share information only where needed to operate the app, comply with legal obligations, enforce our terms, investigate misuse, or protect users and the service.",
      "If third-party infrastructure is used for hosting, storage, analytics, notifications, or authentication, those providers may process information on our behalf for those limited purposes.",
    ],
  },
  {
    eyebrow: "RETENTION AND YOUR CHOICES",
    title: "Access, updates, and deletion",
    paragraphs: [
      "We retain information for as long as needed to operate the app, maintain backups, resolve disputes, meet legal obligations, and protect the integrity of the service.",
      "You may update parts of your account information through the app. If you request deletion, some records may remain for a limited time where retention is necessary for legal, security, fraud-prevention, or backup-recovery reasons.",
    ],
  },
];

export default function PrivavcyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy Policy"
      subtitle="Data stewardship"
      description="A clear summary of how The Conservatory collects, uses, stores, and protects the information you choose to keep in your botanical archive."
      prefaceLabel="POLICY SUMMARY"
      prefaceTitle="How we handle your information"
      prefaceBody="The Conservatory is designed to help you record plant care, photos, memorials, and collection history. This policy explains what information we collect, why we use it, when it may be shared, and the choices available to you."
      sections={sections}
      closingNote="This screen is a product-facing privacy summary. The team should ensure it stays aligned with the app's actual storage, analytics, backup, and deletion behavior."
    />
  );
}

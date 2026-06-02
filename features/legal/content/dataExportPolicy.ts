import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export const dataExportSections: LegalSection[] = [
  {
    eyebrow: "HOW TO EXPORT",
    title: "In-app export flow",
    paragraphs: [
      "Go to Profile → Data & Backup → Export Collection Data, or open Export Collection Data directly from Privacy & Security.",
      "The app generates a JSON file on your device and opens the system share sheet so you can save or send the file.",
    ],
  },
  {
    eyebrow: "EXPORT FORMAT",
    title: "JSON structure",
    paragraphs: [
      "Exports use JSON format with exportVersion 2. The file includes metadata such as export timestamp, mode, and an explicit note that authentication credentials are excluded.",
      "You may re-import a prior export using Import Collection Data, subject to validation and confirmation in the app.",
    ],
  },
  {
    eyebrow: "BASIC EXPORT",
    title: "Free tier scope",
    paragraphs: [
      "Basic export includes plants, care logs, reminders, memorial/graveyard entries, and preferences.",
      "Photos are represented by counts only in basic mode. Care log tags, status snapshots, specimen tags, and archive curation overrides are not included in full.",
    ],
  },
  {
    eyebrow: "PREMIUM EXPORT",
    title: "Premium tier scope",
    paragraphs: [
      "Premium export includes everything in basic export plus full photo metadata and local URIs, care log tags, plant status snapshots, specimen tags, and archive curation overrides.",
    ],
  },
  {
    eyebrow: "EXCLUDED FROM EXPORT",
    title: "What exports never include",
    paragraphs: [
      "Exports do not include passwords, authentication tokens, Supabase session material, RevenueCat receipts, or platform store billing credentials.",
      "Exports reflect data available on your device at export time. Cloud-only copies not yet hydrated locally may be incomplete until sync completes.",
    ],
  },
];

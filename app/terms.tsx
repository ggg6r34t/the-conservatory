import {
  LegalDocumentScreen,
  type LegalSection,
} from "@/features/profile/components/LegalDocumentScreen";

const sections: LegalSection[] = [
  {
    eyebrow: "USING THE APP",
    title: "Eligibility and account responsibility",
    paragraphs: [
      "You are responsible for the activity that occurs under your account and for keeping your sign-in credentials secure. You agree to provide accurate information where required and to use the app only in lawful ways.",
      "If you use The Conservatory for an organization, studio, or shared collection, you confirm that you have authority to act on that entity's behalf.",
    ],
  },
  {
    eyebrow: "YOUR CONTENT",
    title: "What you keep and what you permit",
    paragraphs: [
      "Your plant records, care logs, photos, notes, memorials, and related archive content remain yours.",
      "By using the app, you give us the limited rights needed to host, store, process, back up, sync, and display that content as required to operate the service and the features you choose to use.",
    ],
  },
  {
    eyebrow: "ACCEPTABLE USE",
    title: "What you may not do",
    paragraphs: [
      "You may not use The Conservatory to violate the law, interfere with the service, attempt unauthorized access, reverse engineer protected systems, misuse other users' information, or upload content you do not have the right to use.",
      "We may limit, suspend, or remove access if conduct threatens the safety, reliability, or integrity of the service.",
    ],
  },
  {
    eyebrow: "SERVICE AVAILABILITY",
    title: "Updates, interruptions, and changes",
    paragraphs: [
      "We may update, improve, limit, or discontinue features at any time. We do not guarantee that every feature will remain available in the same form forever.",
      "The app may occasionally be unavailable due to maintenance, technical issues, network failures, provider outages, or circumstances outside our reasonable control.",
    ],
  },
  {
    eyebrow: "OWNERSHIP AND LIMITS",
    title: "Intellectual property, disclaimers, and liability",
    paragraphs: [
      "The Conservatory, including its design, branding, software, and proprietary features, is owned by its rights holders and protected by applicable intellectual property laws. These terms do not give you ownership of the app or its underlying software.",
      'To the extent permitted by law, the service is provided on an "as available" and "as is" basis. We do not guarantee uninterrupted operation, complete accuracy, or fitness for every personal, commercial, or horticultural purpose, and our liability is limited to the maximum extent permitted by applicable law.',
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      title="Terms of Service"
      subtitle="Membership guide"
      description="The rules and expectations that apply when you use The Conservatory and maintain a collection within the app."
      prefaceLabel="SERVICE TERMS"
      prefaceTitle="Using The Conservatory responsibly"
      prefaceBody="These terms explain how you may use The Conservatory, what remains yours, what belongs to us, and the boundaries that protect the service for everyone who uses it."
      sections={sections}
      closingNote="The team should confirm these terms remain aligned with actual subscription, account, moderation, and support practices before release."
    />
  );
}

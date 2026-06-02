import { LEGAL_CONTACT } from "@/features/legal/constants";
import { subscriptionTermsSections } from "@/features/legal/content/subscriptionTerms";
import type { LegalDocumentConfig } from "@/features/legal/types";

export const termsOfServiceDocument: LegalDocumentConfig = {
  title: "Terms of Service",
  subtitle: "Membership & billing",
  description:
    "The rules, subscription terms, and expectations that apply when you use The Conservatory.",
  prefaceLabel: "SERVICE TERMS",
  prefaceTitle: "Agreement to these terms",
  prefaceBody:
    "By creating an account, subscribing, or using The Conservatory, you agree to these Terms of Service, including the subscription and billing terms in Part II below. If you do not agree, do not use the app.",
  sections: [
    {
      eyebrow: "ELIGIBILITY",
      title: "Who may use the service",
      paragraphs: [
        "You must be at least 13 years old, or the minimum age required in your jurisdiction, to use The Conservatory. If you are under the age of majority where you live, you may use the app only with permission from a parent or legal guardian who accepts these terms on your behalf.",
        "You are responsible for all activity under your account and for keeping your sign-in credentials secure. You agree to provide accurate account information and to use the app only in lawful ways.",
      ],
    },
    {
      eyebrow: "YOUR CONTENT",
      title: "Ownership and license you grant",
      paragraphs: [
        "Your plant records, care logs, photos, notes, memorial entries, graveyard records, reminders, and related archive content remain yours.",
        "You grant us the limited rights needed to host, store, process, back up, sync, and display that content solely to operate the service and the features you choose to enable.",
      ],
    },
    {
      eyebrow: "ACCEPTABLE USE",
      title: "Prohibited conduct",
      paragraphs: [
        "You may not use The Conservatory to violate applicable law, interfere with the service, attempt unauthorized access, reverse engineer protected systems, misuse other users' information, or upload content you do not have the right to use.",
        "We may limit, suspend, or remove access if conduct threatens the safety, reliability, or integrity of the service.",
      ],
    },
    {
      eyebrow: "AI FEATURES",
      title: "Informational tools only",
      paragraphs: [
        "The Conservatory may provide AI-assisted insights, summaries, species suggestions, and related features. These outputs are generated from your collection data and, where enabled, cloud processing. They are provided for informational purposes only.",
        "AI features do not provide professional horticultural, agricultural, medical, or legal advice. You remain responsible for plant care decisions. See the AI Disclosure Policy in the app for details.",
      ],
    },
    {
      eyebrow: "SERVICE CHANGES",
      title: "Availability and updates",
      paragraphs: [
        "We may update, improve, limit, or discontinue features at any time. We do not guarantee that every feature will remain available in the same form forever.",
        "The app may occasionally be unavailable due to maintenance, technical issues, network failures, provider outages, or circumstances outside our reasonable control.",
      ],
    },
    {
      eyebrow: "INTELLECTUAL PROPERTY",
      title: "App ownership",
      paragraphs: [
        "The Conservatory, including its design, branding, software, and proprietary features, is owned by its rights holders and protected by applicable intellectual property laws. These terms do not transfer ownership of the app or its underlying software to you.",
      ],
    },
    {
      eyebrow: "TERMINATION",
      title: "Ending your use",
      paragraphs: [
        "You may stop using the app at any time and may delete your account from Privacy & Security in the app. We may suspend or terminate access if you materially breach these terms or if required for legal, security, or operational reasons.",
        "Sections that by their nature should survive termination, including disclaimers and limitations of liability, will continue to apply.",
      ],
    },
    {
      eyebrow: "DISCLAIMERS",
      title: "No warranties",
      paragraphs: [
        'To the maximum extent permitted by applicable law, The Conservatory is provided on an "as available" and "as is" basis. We do not guarantee uninterrupted operation, complete accuracy of care reminders or AI outputs, or fitness for every personal, commercial, or horticultural purpose.',
      ],
    },
    {
      eyebrow: "LIABILITY",
      title: "Limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of plants, data, profits, or goodwill arising from your use of the service.",
        "Our aggregate liability for claims relating to the service will not exceed the greater of (a) the amount you paid us for Premium in the twelve months before the claim or (b) USD $50, except where applicable law requires otherwise.",
      ],
    },
    {
      eyebrow: "PART II",
      title: "Subscription & billing terms",
      paragraphs: [
        "The Conservatory Premium is sold as an auto-renewing subscription through the Apple App Store or Google Play, processed by RevenueCat on our behalf. Your collection data remains yours and is not deleted when a subscription ends, although some Premium-only features may become unavailable.",
      ],
    },
    ...subscriptionTermsSections,
    {
      eyebrow: "GOVERNING LAW",
      title: "Disputes and contact",
      paragraphs: [
        "These terms are governed by the laws of the State of Delaware, United States, excluding conflict-of-law rules, except where mandatory consumer protection laws in your country of residence provide otherwise.",
        `Questions about these terms may be sent to ${LEGAL_CONTACT.legalEmail}.`,
      ],
    },
  ],
};

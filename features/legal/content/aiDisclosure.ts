import type { LegalDocumentConfig } from "@/features/legal/types";

export const aiDisclosureDocument: LegalDocumentConfig = {
  title: "AI Disclosure Policy",
  subtitle: "How AI features work",
  description:
    "Disclosures about AI-assisted features in The Conservatory, including limitations and your responsibilities.",
  prefaceLabel: "AI DISCLOSURE",
  prefaceTitle: "Informational assistance, not professional advice",
  prefaceBody:
    "The Conservatory includes features that generate insights, summaries, species suggestions, and care refinements from your collection data. These tools are designed to help you reflect on your plants—not to replace expert judgment.",
  sections: [
    {
      eyebrow: "FEATURES",
      title: "What AI features do",
      paragraphs: [
        "The app may provide plant health insights, dashboard editorials, journal summaries, streak nudges, archive gallery curation suggestions, species identification suggestions, care log refinements, and reminder optimization.",
        "Many outputs are generated locally on your device from your care history and plant records. Premium users may also receive enhanced outputs when cloud assistance is enabled and available.",
      ],
    },
    {
      eyebrow: "DATA USED",
      title: "What information is processed",
      paragraphs: [
        "AI features use information you already store in the app, such as plant names, species labels, care log notes, watering patterns, photo references, and locally computed summaries.",
        "When cloud assistance is enabled, selected metadata and summaries may be transmitted to our Supabase edge functions for processing. Photo files are referenced by URI; full image uploads for AI are not a separate feature unless explicitly shown in the UI.",
        "The app does not currently route your data to third-party LLM providers such as OpenAI or Anthropic.",
      ],
    },
    {
      eyebrow: "ACCURACY",
      title: "Outputs may be incomplete or wrong",
      paragraphs: [
        "AI-generated and rule-based outputs may be inaccurate, outdated, incomplete, or not suitable for your specific plant, climate, soil, pests, or environment.",
        "Species suggestions and health insights are estimates. Always verify identifications and care recommendations against trusted sources and your own observation.",
      ],
    },
    {
      eyebrow: "NOT PROFESSIONAL ADVICE",
      title: "No horticultural guarantee",
      paragraphs: [
        "The Conservatory does not provide professional horticultural, agricultural, botanical, medical, or legal advice.",
        "We do not guarantee that following an insight, reminder adjustment, or species suggestion will improve plant health or prevent loss.",
      ],
    },
    {
      eyebrow: "YOUR RESPONSIBILITY",
      title: "Human verification expected",
      paragraphs: [
        "You remain solely responsible for watering, fertilizing, repotting, pest treatment, and all other care decisions.",
        "Review AI suggestions critically before acting on them, especially for rare, toxic, edible, or high-value plants.",
      ],
    },
    {
      eyebrow: "QUOTAS",
      title: "Usage limits",
      paragraphs: [
        "Some AI features are subject to monthly usage limits or Premium entitlement. Limits are enforced in the app and may change over time.",
      ],
    },
    {
      eyebrow: "LABELS",
      title: "How sources are shown",
      paragraphs: [
        'In the app, insights may be labeled "Generated locally" when prepared on your device, or "Enhanced insight" when cloud assistance was used. These labels describe the processing path, not a guarantee of accuracy.',
      ],
    },
  ],
};

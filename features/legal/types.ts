import type { LegalSection } from "@/features/profile/components/LegalDocumentScreen";

export type LegalDocumentConfig = {
  title: string;
  subtitle: string;
  description: string;
  prefaceLabel: string;
  prefaceTitle: string;
  prefaceBody: string;
  sections: LegalSection[];
};

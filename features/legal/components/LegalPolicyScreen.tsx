import { LegalDocumentScreen } from "@/features/profile/components/LegalDocumentScreen";
import {
  LEGAL_CONTACT,
  LEGAL_LAST_UPDATED,
} from "@/features/legal/constants";
import type { LegalDocumentConfig } from "@/features/legal/types";

interface LegalPolicyScreenProps {
  document: LegalDocumentConfig;
  contactEmail?: string;
}

export function LegalPolicyScreen({
  document,
  contactEmail = LEGAL_CONTACT.privacyEmail,
}: LegalPolicyScreenProps) {
  return (
    <LegalDocumentScreen
      {...document}
      lastUpdated={LEGAL_LAST_UPDATED}
      contactEmail={contactEmail}
    />
  );
}

import { LegalPolicyScreen } from "@/features/legal/components/LegalPolicyScreen";
import { termsOfServiceDocument } from "@/features/legal/content/termsOfService";
import { LEGAL_CONTACT } from "@/features/legal/constants";

export default function TermsScreen() {
  return (
    <LegalPolicyScreen
      document={termsOfServiceDocument}
      contactEmail={LEGAL_CONTACT.legalEmail}
    />
  );
}

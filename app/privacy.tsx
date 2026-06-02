import { LegalPolicyScreen } from "@/features/legal/components/LegalPolicyScreen";
import { privacyPolicyDocument } from "@/features/legal/content/privacyPolicy";

export default function PrivacyScreen() {
  return <LegalPolicyScreen document={privacyPolicyDocument} />;
}

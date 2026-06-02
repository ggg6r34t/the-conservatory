import { LegalPolicyScreen } from "@/features/legal/components/LegalPolicyScreen";
import { aiDisclosureDocument } from "@/features/legal/content/aiDisclosure";

export default function AiDisclosureScreen() {
  return <LegalPolicyScreen document={aiDisclosureDocument} />;
}

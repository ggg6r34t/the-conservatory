import { LegalPolicyScreen } from "@/features/legal/components/LegalPolicyScreen";
import { thirdPartyLicensesDocument } from "@/features/legal/content/thirdPartyLicenses";

export default function LicenseScreen() {
  return <LegalPolicyScreen document={thirdPartyLicensesDocument} />;
}

import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";
import { validateBillingConfig } from "@/features/billing/config";

export interface ReleaseValidationIssue {
  code: string;
  message: string;
}

export function collectReleaseValidationIssues(): ReleaseValidationIssue[] {
  const issues: ReleaseValidationIssue[] = [];
  const backend = getBackendConfigurationSummary();

  if (backend.requiresReleaseConfig) {
    issues.push({
      code: "supabase_missing",
      message: backend.description,
    });
  }

  const billingValidation = validateBillingConfig();
  if (!billingValidation.valid && billingValidation.missing.length > 0) {
    issues.push({
      code: "billing_missing",
      message:
        "Subscription services are not fully configured for this production build.",
    });
  }

  return issues;
}

export function isReleaseConfigurationValid() {
  return collectReleaseValidationIssues().length === 0;
}

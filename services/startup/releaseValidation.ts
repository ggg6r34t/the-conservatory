import { env } from "@/config/env";
import { validateBillingConfig } from "@/features/billing/config";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

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

  if (
    backend.isSupabaseConfigured &&
    env.isProductionBuild &&
    !env.googleWebClientId
  ) {
    issues.push({
      code: "google_oauth_missing",
      message:
        "Google Sign In requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in production builds.",
    });
  }

  return issues;
}

export function isReleaseConfigurationValid() {
  return collectReleaseValidationIssues().length === 0;
}

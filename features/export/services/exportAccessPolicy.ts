import { FREE_CARE_LOG_HISTORY_DAYS } from "@/features/billing/constants";
import { assertFeatureAccess } from "@/features/billing/services/featureAccess";
import { getFreeCareLogHistorySince } from "@/features/care-logs/services/careLogHistoryService";
import { getEntitlementState } from "@/services/entitlementState";

export type ExportMode = "basic" | "premium";

export function assertPremiumExportAccess() {
  assertFeatureAccess("premium_export", getEntitlementState());
}

export function resolveExportMode(requested?: ExportMode): ExportMode {
  if (requested === "premium") {
    assertPremiumExportAccess();
    return "premium";
  }
  if (requested === "basic") {
    return "basic";
  }
  return getEntitlementState() ? "premium" : "basic";
}

export function getCareLogHistorySinceForMode(mode: ExportMode) {
  return mode === "premium" ? undefined : getFreeCareLogHistorySince();
}

export function getCareLogHistorySinceForDisplay(
  isPremium: boolean,
  scope: "streak" | "display",
) {
  if (scope === "streak" || isPremium) {
    return undefined;
  }
  return getFreeCareLogHistorySince();
}

export function getExportCareLogHistoryLimitDays(mode: ExportMode) {
  return mode === "premium" ? null : FREE_CARE_LOG_HISTORY_DAYS;
}

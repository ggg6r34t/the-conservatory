import { FREE_CARE_LOG_HISTORY_DAYS } from "@/features/billing/constants";
import { canUseFeature } from "@/features/billing/services/entitlementService";
import type { UsageSnapshot } from "@/features/billing/types";
import { getFreeCareLogHistorySince } from "@/features/care-logs/services/careLogHistoryService";
import { getEntitlementState } from "@/services/entitlementState";

export type ExportMode = "basic" | "premium";

const EMPTY_USAGE: UsageSnapshot = {
  totalPlantCount: 0,
  progressPhotosForPlant: {},
  aiHealthInsightsThisMonth: {},
  plantIdThisMonth: 0,
};

export function assertPremiumExportAccess() {
  const access = canUseFeature(
    "premium_export",
    getEntitlementState(),
    EMPTY_USAGE,
  );
  if (!access.canUse) {
    throw new Error("Premium is required for enhanced collection export.");
  }
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

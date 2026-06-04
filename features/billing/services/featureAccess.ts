import { canUseFeature } from "@/features/billing/services/entitlementService";
import type { GatedFeature, UsageSnapshot } from "@/features/billing/types";

export const EMPTY_USAGE: UsageSnapshot = {
  totalPlantCount: 0,
  progressPhotosForPlant: {},
  aiHealthInsightsThisMonth: {},
  plantIdThisMonth: 0,
};

const PREMIUM_REQUIRED_MESSAGES: Partial<Record<GatedFeature, string>> = {
  ai_journal_narrative: "Premium is required for AI journal narratives.",
  ai_dashboard_editorial: "Premium is required for AI dashboard insights.",
  ai_archive_curation: "Premium is required for AI archive curation.",
  ai_care_schedule: "Premium is required for AI care schedule suggestions.",
  specimen_tag_create: "Premium is required to create specimen tags.",
  advanced_library_filters: "Premium is required for advanced library filters.",
  premium_export: "Premium is required for enhanced collection export.",
};

export function isFeatureAllowed(
  feature: GatedFeature,
  isPremium: boolean,
  usage: UsageSnapshot = EMPTY_USAGE,
  entityId?: string,
) {
  return canUseFeature(feature, isPremium, usage, entityId).canUse;
}

export function cloudAllowedForFeature(
  feature: GatedFeature,
  isPremium: boolean,
  usage: UsageSnapshot = EMPTY_USAGE,
  entityId?: string,
) {
  return isFeatureAllowed(feature, isPremium, usage, entityId);
}

export function assertFeatureAccess(
  feature: GatedFeature,
  isPremium: boolean,
  usage: UsageSnapshot = EMPTY_USAGE,
  entityId?: string,
) {
  const access = canUseFeature(feature, isPremium, usage, entityId);
  if (access.canUse) {
    return;
  }

  if (access.reason === "requires_premium") {
    throw new Error(
      PREMIUM_REQUIRED_MESSAGES[feature] ??
        "Premium is required for this feature.",
    );
  }

  throw new Error(
    `You have reached the free limit for this feature (${access.used} of ${access.limit}).`,
  );
}

import type { GatedFeature } from './types';

export const FREE_PLANT_LIMIT = 10;
export const FREE_PROGRESS_PHOTOS_PER_PLANT = 3;
export const FREE_CARE_LOG_HISTORY_DAYS = 60;
export const FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH = 1;
export const FREE_PLANT_IDENTIFICATIONS_PER_MONTH = 3;

export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM ?? 'premium';

/** Store + RevenueCat product / package identifiers (launch SKUs). */
export const PREMIUM_PACKAGE_IDENTIFIERS = {
  monthly: 'conservatory_premium_monthly',
  annual: 'conservatory_premium_annual',
} as const;

/** Deferred at launch — do not surface in offerings UI yet. */
export const PREMIUM_LIFETIME_PACKAGE_IDENTIFIER =
  'conservatory_premium_lifetime';

export const FEATURE_REQUIRES_PREMIUM: Record<GatedFeature, boolean> = {
  plant_create: false,
  progress_photo_upload: false,
  ai_health_insight: false,
  ai_journal_narrative: true,
  ai_dashboard_editorial: true,
  ai_archive_curation: true,
  ai_species_identification: false,
  smart_reminder_optimization: false,
  specimen_tag_create: true,
  advanced_library_filters: true,
  premium_export: true,
};

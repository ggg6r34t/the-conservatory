import {
  FEATURE_REQUIRES_PREMIUM,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
} from '../constants';
import type {
  FeatureAccessResult,
  GatedFeature,
  UsageSnapshot,
} from '../types';

export function canUseFeature(
  feature: GatedFeature,
  isPremium: boolean,
  usage: UsageSnapshot,
  entityId?: string,
): FeatureAccessResult {
  if (FEATURE_REQUIRES_PREMIUM[feature] && !isPremium) {
    return { canUse: false, reason: 'requires_premium' };
  }

  if (isPremium) {
    return { canUse: true };
  }

  switch (feature) {
    case 'plant_create': {
      const count = usage.totalPlantCount;
      if (count >= FREE_PLANT_LIMIT) {
        return { canUse: false, reason: 'quota_exceeded', used: count, limit: FREE_PLANT_LIMIT };
      }
      return { canUse: true };
    }

    case 'progress_photo_upload': {
      const plantId = entityId ?? '';
      const count = usage.progressPhotosForPlant[plantId] ?? 0;
      if (count >= FREE_PROGRESS_PHOTOS_PER_PLANT) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_PROGRESS_PHOTOS_PER_PLANT,
        };
      }
      return { canUse: true };
    }

    case 'ai_health_insight': {
      const plantId = entityId ?? '';
      const count = usage.aiHealthInsightsThisMonth[plantId] ?? 0;
      if (count >= FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
        };
      }
      return { canUse: true };
    }

    case 'ai_species_identification': {
      const count = usage.plantIdThisMonth;
      if (count >= FREE_PLANT_IDENTIFICATIONS_PER_MONTH) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
        };
      }
      return { canUse: true };
    }

    default:
      return { canUse: true };
  }
}

import {
  FREE_PLANT_LIMIT,
} from '@/features/billing/constants';
import {
  canUseFeature,
} from '@/features/billing/services/entitlementService';

describe('plant creation gate', () => {
  it('blocks at FREE_PLANT_LIMIT plants for free user', () => {
    const result = canUseFeature(
      'plant_create',
      false,
      { totalPlantCount: FREE_PLANT_LIMIT, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(false);
    if (!result.canUse && result.reason === 'quota_exceeded') {
      expect(result.reason).toBe('quota_exceeded');
      expect(result.limit).toBe(FREE_PLANT_LIMIT);
    }
  });

  it('allows at FREE_PLANT_LIMIT - 1 plants for free user', () => {
    const result = canUseFeature(
      'plant_create',
      false,
      { totalPlantCount: FREE_PLANT_LIMIT - 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(true);
  });

  it('never blocks premium user regardless of count', () => {
    const result = canUseFeature(
      'plant_create',
      true,
      { totalPlantCount: 999, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(true);
  });
});

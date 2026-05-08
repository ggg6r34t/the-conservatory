import { FEATURE_REQUIRES_PREMIUM } from '@/features/billing/constants';
import { canUseFeature } from '@/features/billing/services/entitlementService';

describe('smart_reminder_optimization classification', () => {
  it('is not in FEATURE_REQUIRES_PREMIUM (it runs for all users)', () => {
    expect(FEATURE_REQUIRES_PREMIUM['smart_reminder_optimization']).toBeFalsy();
  });

  it('canUseFeature allows free users to use smart_reminder_optimization', () => {
    const result = canUseFeature(
      'smart_reminder_optimization',
      false,
      {
        totalPlantCount: 5,
        progressPhotosForPlant: {},
        aiHealthInsightsThisMonth: {},
        plantIdThisMonth: 0,
      },
    );
    expect(result.canUse).toBe(true);
  });
});

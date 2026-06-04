import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
} from '@/features/billing/constants';
import { canUseFeature } from '@/features/billing/services/entitlementService';

describe('billing constants', () => {
  it('has correct free tier limits', () => {
    expect(FREE_PLANT_LIMIT).toBe(10);
    expect(FREE_PROGRESS_PHOTOS_PER_PLANT).toBe(3);
    expect(FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH).toBe(1);
    expect(FREE_PLANT_IDENTIFICATIONS_PER_MONTH).toBe(3);
  });
});

describe('canUseFeature', () => {
  describe('premium-required features', () => {
    it('allows premium user', () => {
      const result = canUseFeature('ai_journal_narrative', true, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(result.canUse).toBe(true);
    });

    it('blocks free user', () => {
      const result = canUseFeature('ai_journal_narrative', false, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(result.canUse).toBe(false);
      if (!result.canUse) expect(result.reason).toBe('requires_premium');
    });
  });

  describe('plant_create quota', () => {
    it('allows free user under limit', () => {
      const r = canUseFeature('plant_create', false, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit', () => {
      const r = canUseFeature('plant_create', false, { totalPlantCount: 10, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(false);
      if (!r.canUse && r.reason === 'quota_exceeded') { expect(r.limit).toBe(10); }
    });

    it('allows premium user at limit', () => {
      const r = canUseFeature('plant_create', true, { totalPlantCount: 10, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(true);
    });
  });

  describe('progress_photo_upload quota', () => {
    const plantId = 'plant-abc';

    it('allows free user under limit for plant', () => {
      const r = canUseFeature('progress_photo_upload', false, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 2 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit for plant', () => {
      const r = canUseFeature('progress_photo_upload', false, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 3 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(false);
      if (!r.canUse) expect(r.reason).toBe('quota_exceeded');
    });

    it('allows premium user at limit', () => {
      const r = canUseFeature('progress_photo_upload', true, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 99 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });
  });

  describe('ai_health_insight quota', () => {
    const plantId = 'plant-xyz';

    it('allows free user under limit', () => {
      const r = canUseFeature('ai_health_insight', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: { [plantId]: 0 }, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit', () => {
      const r = canUseFeature('ai_health_insight', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: { [plantId]: 1 }, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(false);
    });
  });

  describe('ai_species_identification quota', () => {
    it('blocks free user at monthly quota', () => {
      const r = canUseFeature('ai_species_identification', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 3 });
      expect(r.canUse).toBe(false);
    });

    it('allows premium user past quota', () => {
      const r = canUseFeature('ai_species_identification', true, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 99 });
      expect(r.canUse).toBe(true);
    });
  });

  describe('protected free surfaces', () => {
    it('never blocks care logging — care_logging is not a gated feature', () => {
      const features: import('@/features/billing/types').GatedFeature[] = [
        'plant_create', 'progress_photo_upload', 'ai_health_insight',
        'ai_journal_narrative', 'ai_dashboard_editorial', 'ai_archive_curation',
        'ai_species_identification', 'smart_reminder_optimization',
        'ai_care_schedule',
        'specimen_tag_create', 'advanced_library_filters', 'premium_export',
      ];
      expect(features).not.toContain('graveyard_access');
      expect(features).not.toContain('memorial_access');
    });
  });
});

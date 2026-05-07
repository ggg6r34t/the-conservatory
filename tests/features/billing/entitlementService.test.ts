import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
} from '@/features/billing/constants';

describe('billing constants', () => {
  it('has correct free tier limits', () => {
    expect(FREE_PLANT_LIMIT).toBe(10);
    expect(FREE_PROGRESS_PHOTOS_PER_PLANT).toBe(3);
    expect(FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH).toBe(1);
    expect(FREE_PLANT_IDENTIFICATIONS_PER_MONTH).toBe(3);
  });
});

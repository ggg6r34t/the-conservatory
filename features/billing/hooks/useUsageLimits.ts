import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDatabase } from '@/services/database/sqlite';

import { getUsageCount } from '../services/usageClient';
import type { UsageSnapshot } from '../types';

async function buildUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const db = await getDatabase();

  const plants = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM plants WHERE user_id = ? AND status = 'active'`,
    [userId],
  );

  const totalPlantCount = plants.length;
  const plantIds = plants.map((p) => p.id);

  // progress photos per plant
  const progressPhotosForPlant: Record<string, number> = {};
  for (const plantId of plantIds) {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos WHERE plant_id = ? AND photo_role = 'progress'`,
      [plantId],
    );
    progressPhotosForPlant[plantId] = row?.count ?? 0;
  }

  // ai health insight usage this month (per plant)
  const aiHealthInsightsThisMonth: Record<string, number> = {};
  for (const plantId of plantIds) {
    const count = await getUsageCount(db, userId, 'ai_health_insight', undefined);
    aiHealthInsightsThisMonth[plantId] = count;
  }

  const plantIdThisMonth = await getUsageCount(db, userId, 'ai_species_identification');

  return {
    totalPlantCount,
    progressPhotosForPlant,
    aiHealthInsightsThisMonth,
    plantIdThisMonth,
  };
}

export function useUsageLimits() {
  const { user } = useAuth();

  return useQuery<UsageSnapshot>({
    queryKey: ['billing', 'usage', user?.id ?? 'none'],
    queryFn: () => buildUsageSnapshot(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });
}

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDatabase } from '@/services/database/sqlite';

import type { UsageSnapshot } from '../types';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function buildUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const db = await getDatabase();

  const plants = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM plants WHERE user_id = ? AND status = 'active'`,
    [userId],
  );

  const totalPlantCount = plants.length;
  const plantIds = plants.map((p) => p.id);

  if (plantIds.length === 0) {
    return {
      totalPlantCount: 0,
      progressPhotosForPlant: {},
      aiHealthInsightsThisMonth: {},
      plantIdThisMonth: 0,
    };
  }

  const placeholders = plantIds.map(() => '?').join(', ');
  const period = currentPeriod();

  // Single aggregate query for progress photos across all plants
  const photoRows = await db.getAllAsync<{ plant_id: string; count: number }>(
    `SELECT plant_id, COUNT(*) as count FROM photos
     WHERE plant_id IN (${placeholders}) AND photo_role = 'progress'
     GROUP BY plant_id`,
    ...plantIds,
  );
  const progressPhotosForPlant: Record<string, number> = {};
  for (const row of photoRows) {
    progressPhotosForPlant[row.plant_id] = row.count;
  }

  // Single query for all AI health insight usage this period.
  // IDs are keyed as `userId:ai_health_insight:plantId:period`.
  const healthInsightIds = plantIds.map(
    (pid) => `${userId}:ai_health_insight:${pid}:${period}`,
  );
  const hiPlaceholders = healthInsightIds.map(() => '?').join(', ');
  const healthRows = await db.getAllAsync<{ id: string; count: number }>(
    `SELECT id, count FROM feature_usage WHERE id IN (${hiPlaceholders})`,
    ...healthInsightIds,
  );
  const prefix = `${userId}:ai_health_insight:`;
  const suffix = `:${period}`;
  const aiHealthInsightsThisMonth: Record<string, number> = {};
  for (const row of healthRows) {
    const plantId = row.id.slice(prefix.length, row.id.length - suffix.length);
    aiHealthInsightsThisMonth[plantId] = row.count;
  }

  // Single row lookup for species-ID usage this period
  const speciesIdRow = await db.getFirstAsync<{ count: number }>(
    `SELECT count FROM feature_usage WHERE id = ?`,
    `${userId}:ai_species_identification:${period}`,
  );

  return {
    totalPlantCount,
    progressPhotosForPlant,
    aiHealthInsightsThisMonth,
    plantIdThisMonth: speciesIdRow?.count ?? 0,
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

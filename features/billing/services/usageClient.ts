import type { SQLiteDatabase } from 'expo-sqlite';

export type TrackableFeature =
  | 'ai_health_insight'
  | 'ai_species_identification';

export interface UsageOptions {
  entityId?: string;
  periodOverride?: string;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function rowId(userId: string, feature: string, period: string, entityId?: string): string {
  return entityId
    ? `${userId}:${feature}:${entityId}:${period}`
    : `${userId}:${feature}:${period}`;
}

export async function incrementUsage(
  db: SQLiteDatabase,
  userId: string,
  feature: TrackableFeature,
  options?: UsageOptions,
): Promise<number> {
  const period = options?.periodOverride ?? currentPeriod();
  const id = rowId(userId, feature, period, options?.entityId);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO feature_usage (id, user_id, feature, period, count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = ?`,
    [id, userId, feature, period, now, now, now],
  );

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT count FROM feature_usage WHERE id = ?`,
    [id],
  );
  return row?.count ?? 1;
}

export async function getUsageCount(
  db: SQLiteDatabase,
  userId: string,
  feature: TrackableFeature,
  options?: UsageOptions,
): Promise<number> {
  const period = options?.periodOverride ?? currentPeriod();
  const id = rowId(userId, feature, period, options?.entityId);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT count FROM feature_usage WHERE id = ?`,
    [id],
  );
  return row?.count ?? 0;
}

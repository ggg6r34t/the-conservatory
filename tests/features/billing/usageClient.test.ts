import { incrementUsage, getUsageCount } from '@/features/billing/services/usageClient';
import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('@/services/database/syncOutbox', () => ({
  insertSyncOutboxOperationInTransaction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/database/syncSignals', () => ({
  notifySyncQueueChanged: jest.fn(),
}));

/**
 * Lightweight in-memory mock for SQLiteDatabase that handles the
 * INSERT ... ON CONFLICT upsert and SELECT queries used by usageClient.
 */
function createMockDb(): SQLiteDatabase {
  const store: Record<string, { id: string; user_id: string; feature: string; period: string; count: number }> = {};

  const runAsync = jest.fn().mockImplementation(async (sql: string, params: unknown[]) => {
    if (sql.includes('INSERT INTO feature_usage')) {
      const [id, userId, feature, period] = params as string[];
      if (store[id]) {
        store[id]!.count += 1;
      } else {
        store[id] = { id, user_id: userId, feature, period, count: 1 };
      }
    }
  });

  const getFirstAsync = jest.fn().mockImplementation(async (_sql: string, params: unknown[]) => {
    const [id] = params as string[];
    return store[id] ? { count: store[id]!.count } : null;
  });

  const withTransactionAsync = jest.fn().mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });

  return { runAsync, getFirstAsync, withTransactionAsync } as unknown as SQLiteDatabase;
}

describe('usageClient', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDb();
  });

  it('increments and reads usage count', async () => {
    const count1 = await incrementUsage(db, 'user-1', 'ai_health_insight');
    expect(count1).toBe(1);

    const count2 = await incrementUsage(db, 'user-1', 'ai_health_insight');
    expect(count2).toBe(2);

    const read = await getUsageCount(db, 'user-1', 'ai_health_insight');
    expect(read).toBe(2);
  });

  it('isolates by user', async () => {
    await incrementUsage(db, 'user-1', 'ai_health_insight');
    const count = await getUsageCount(db, 'user-2', 'ai_health_insight');
    expect(count).toBe(0);
  });

  it('isolates by period', async () => {
    await incrementUsage(db, 'user-1', 'ai_health_insight', { periodOverride: '2025-01' });
    const count = await getUsageCount(db, 'user-1', 'ai_health_insight', { periodOverride: '2025-02' });
    expect(count).toBe(0);
  });

  it('isolates by entityId', async () => {
    await incrementUsage(db, 'user-1', 'ai_health_insight', { entityId: 'plant-1' });
    await incrementUsage(db, 'user-1', 'ai_health_insight', { entityId: 'plant-1' });
    const countPlant1 = await getUsageCount(db, 'user-1', 'ai_health_insight', { entityId: 'plant-1' });
    const countPlant2 = await getUsageCount(db, 'user-1', 'ai_health_insight', { entityId: 'plant-2' });
    const countNoEntity = await getUsageCount(db, 'user-1', 'ai_health_insight');
    expect(countPlant1).toBe(2);
    expect(countPlant2).toBe(0);
    expect(countNoEntity).toBe(0);
  });
});

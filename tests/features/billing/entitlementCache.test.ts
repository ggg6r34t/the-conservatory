import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearEntitlementCache,
  readEntitlementCache,
  resolveEffectiveTier,
  writeEntitlementCache,
} from '@/features/billing/services/entitlementCache';
import type { EntitlementCacheEntry } from '@/features/billing/services/entitlementCache';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const PREMIUM_ENTRY: EntitlementCacheEntry = {
  tier: 'premium',
  expiresAt: null,
  period: 'monthly',
  lastVerifiedAt: '2026-05-01T10:00:00.000Z',
};

describe('entitlementCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no cache exists', async () => {
    const result = await readEntitlementCache();
    expect(result).toBeNull();
  });

  it('round-trips a premium cache entry', async () => {
    await writeEntitlementCache(PREMIUM_ENTRY);
    const result = await readEntitlementCache();
    expect(result).toEqual(PREMIUM_ENTRY);
  });

  it('returns null after cache is cleared', async () => {
    await writeEntitlementCache(PREMIUM_ENTRY);
    await clearEntitlementCache();
    const result = await readEntitlementCache();
    expect(result).toBeNull();
  });

  it('overwrites an existing cache entry', async () => {
    await writeEntitlementCache(PREMIUM_ENTRY);
    const updated: EntitlementCacheEntry = { ...PREMIUM_ENTRY, tier: 'free', period: null };
    await writeEntitlementCache(updated);
    const result = await readEntitlementCache();
    expect(result?.tier).toBe('free');
  });
});

describe('resolveEffectiveTier', () => {
  it('returns premium when tier is premium and expiresAt is null', () => {
    expect(resolveEffectiveTier({ tier: 'premium', expiresAt: null, period: 'monthly', lastVerifiedAt: '' })).toBe('premium');
  });

  it('returns premium when tier is premium and expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(resolveEffectiveTier({ tier: 'premium', expiresAt: future, period: 'monthly', lastVerifiedAt: '' })).toBe('premium');
  });

  it('returns free when tier is premium but expiresAt is in the past', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(resolveEffectiveTier({ tier: 'premium', expiresAt: past, period: 'monthly', lastVerifiedAt: '' })).toBe('free');
  });

  it('returns free when tier is free regardless of expiresAt', () => {
    expect(resolveEffectiveTier({ tier: 'free', expiresAt: null, period: null, lastVerifiedAt: '' })).toBe('free');
  });
});

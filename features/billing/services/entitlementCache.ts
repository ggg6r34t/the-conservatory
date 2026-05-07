import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubscriptionPeriod, SubscriptionTier } from '../types';

const CACHE_KEY = '@conservatory/entitlement_cache';

export interface EntitlementCacheEntry {
  tier: SubscriptionTier;
  expiresAt: string | null;
  period: SubscriptionPeriod | null;
  lastVerifiedAt: string;
}

export async function readEntitlementCache(): Promise<EntitlementCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EntitlementCacheEntry;
  } catch {
    return null;
  }
}

export async function writeEntitlementCache(entry: EntitlementCacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Non-fatal — degraded gracefully if storage unavailable
  }
}

export async function clearEntitlementCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Non-fatal
  }
}

export function resolveEffectiveTier(entry: EntitlementCacheEntry): SubscriptionTier {
  if (entry.tier !== 'premium') return 'free';
  if (!entry.expiresAt) return 'premium';
  return new Date(entry.expiresAt) > new Date() ? 'premium' : 'free';
}

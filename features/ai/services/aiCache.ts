import AsyncStorage from "@react-native-async-storage/async-storage";

import { logger } from "@/utils/logger";

interface CacheEnvelope<T> {
  expiresAt: number;
  value: T;
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.expiresAt !== "number") {
      await AsyncStorage.removeItem(key);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch (error) {
    logger.warn("ai.cache.read_failed", {
      key,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function setCachedValue<T>(
  key: string,
  value: T,
  ttlMs: number,
) {
  try {
    const envelope: CacheEnvelope<T> = {
      expiresAt: Date.now() + ttlMs,
      value,
    };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    logger.warn("ai.cache.write_failed", {
      key,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function removeCachedValue(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.warn("ai.cache.remove_failed", {
      key,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

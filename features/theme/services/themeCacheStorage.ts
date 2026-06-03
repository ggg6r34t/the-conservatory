import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_THEME_ID, resolveThemeId } from "@/features/theme/registry";
import type { ThemeId } from "@/features/theme/types";

const THEME_CACHE_KEY = "@conservatory/preferred-theme";

export async function readCachedThemeId(): Promise<ThemeId | null> {
  try {
    const raw = await AsyncStorage.getItem(THEME_CACHE_KEY);
    return raw ? resolveThemeId(raw) : null;
  } catch {
    return null;
  }
}

export async function writeCachedThemeId(themeId: ThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_CACHE_KEY, themeId);
  } catch {
    // Cache is best-effort; SQLite remains source of truth.
  }
}

export async function clearCachedThemeId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THEME_CACHE_KEY);
  } catch {
    // no-op
  }
}

export function getBootstrapThemeId(
  cachedThemeId: ThemeId | null,
  preferredTheme?: string | null,
): ThemeId {
  if (preferredTheme) {
    return resolveThemeId(preferredTheme);
  }

  return cachedThemeId ?? DEFAULT_THEME_ID;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

import { resolveThemeId } from "@/features/theme/registry";
import { resolveBootstrapThemeId } from "@/features/theme/services/themeBootstrap";
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

export const getBootstrapThemeId = resolveBootstrapThemeId;

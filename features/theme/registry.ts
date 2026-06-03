import {
  DEFAULT_THEME_ID,
  themeCatalog,
  themeCatalogById,
} from "@/features/theme/catalog";
import type { BotanicalTokens } from "@/features/theme/types";
import { THEME_IDS, type ThemeDefinition, type ThemeId } from "@/features/theme/types";
import { botanicalSharedTokens } from "@/features/theme/tokens/shared";

export { DEFAULT_THEME_ID, themeCatalog, themeCatalogById, THEME_IDS };

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && THEME_IDS.includes(value as ThemeId));
}

export function resolveThemeId(
  value: string | null | undefined,
  options?: { fallback?: ThemeId },
): ThemeId {
  if (isThemeId(value)) {
    return value;
  }

  return options?.fallback ?? DEFAULT_THEME_ID;
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeCatalogById[themeId];
}

const tokenCache = new Map<ThemeId, BotanicalTokens>();

export function buildThemeTokens(themeId: ThemeId): BotanicalTokens {
  const cached = tokenCache.get(themeId);
  if (cached) {
    return cached;
  }

  const definition = getThemeDefinition(themeId);
  const tokens = {
    ...botanicalSharedTokens,
    colors: definition.colors,
  };
  tokenCache.set(themeId, tokens);
  return tokens;
}

export function clearThemeTokenCache(): void {
  tokenCache.clear();
}

export function formatThemeName(themeId: ThemeId | string | undefined): string {
  return getThemeDefinition(resolveThemeId(themeId)).name;
}

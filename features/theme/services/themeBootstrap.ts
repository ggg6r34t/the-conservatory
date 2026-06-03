import { DEFAULT_THEME_ID, resolveThemeId } from "@/features/theme/registry";
import type { ThemeId } from "@/features/theme/types";

export function resolveBootstrapThemeId(
  cachedThemeId: ThemeId | null,
  preferredTheme?: string | null,
): ThemeId {
  if (preferredTheme) {
    return resolveThemeId(preferredTheme);
  }

  return cachedThemeId ?? DEFAULT_THEME_ID;
}

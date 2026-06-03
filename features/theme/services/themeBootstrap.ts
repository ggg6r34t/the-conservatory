import { DEFAULT_THEME_ID, resolveThemeId } from "@/features/theme/registry";
import {
  canUseTheme,
  type ThemeSubscriptionSnapshot,
} from "@/features/theme/themeAccess";
import type { ThemeId } from "@/features/theme/types";

export function resolveBootstrapThemeId(
  cachedThemeId: ThemeId | null,
  preferredTheme?: string | null,
  subscription?: ThemeSubscriptionSnapshot,
): ThemeId {
  const candidate = preferredTheme
    ? resolveThemeId(preferredTheme)
    : (cachedThemeId ?? DEFAULT_THEME_ID);

  if (!subscription) {
    return candidate;
  }

  return canUseTheme(candidate, subscription).resolvedThemeId;
}

import { resolveThemeId } from "@/features/theme/registry";
import type { ThemeId } from "@/features/theme/types";

/** Resolves the theme id shown in Profile and other settings surfaces. */
export function resolveDisplayedPreferredThemeId(input: {
  activeThemeId: ThemeId;
  hydrated: boolean;
  persistedThemeId?: string | null;
}): ThemeId {
  const persisted = input.persistedThemeId
    ? resolveThemeId(input.persistedThemeId)
    : null;

  if (input.hydrated) {
    return input.activeThemeId;
  }

  return persisted ?? input.activeThemeId;
}

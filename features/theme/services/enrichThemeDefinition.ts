import type { ThemeDefinition } from "@/features/theme/types";

import { buildThemeAccessibilityProfile } from "./themeAccessibility";

export function enrichThemeDefinition(theme: ThemeDefinition): ThemeDefinition {
  return {
    ...theme,
    accessibility: buildThemeAccessibilityProfile({
      colors: theme.colors,
      previewSurfaces: theme.preview.surfaces,
    }),
  };
}

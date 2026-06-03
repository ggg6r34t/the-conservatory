import { trackThemeContrastIssueDetected } from "@/features/theme/analytics";
import type { ThemeDefinition } from "@/features/theme/types";

import { buildThemeAccessibilityProfile } from "./themeAccessibility";

export function enrichThemeDefinition(theme: ThemeDefinition): ThemeDefinition {
  const accessibility = buildThemeAccessibilityProfile({
    colors: theme.colors,
    previewSurfaces: theme.preview.surfaces,
  });

  if (!accessibility.passesWcagAa) {
    trackThemeContrastIssueDetected({
      theme_id: theme.id,
      source: "theme_catalog_enrichment",
      notes: accessibility.notes,
    });
  }

  return {
    ...theme,
    accessibility,
  };
}

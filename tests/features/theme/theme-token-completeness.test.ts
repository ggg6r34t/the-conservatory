import { themeCatalog } from "@/features/theme/catalog";
import {
  buildThemeTokens,
  getThemeDefinition,
} from "@/features/theme/registry";
import { REQUIRED_SEMANTIC_TOKEN_KEYS } from "@/features/theme/tokens/semanticTokens";

describe("theme token completeness", () => {
  it("defines every required semantic token for each theme", () => {
    for (const theme of themeCatalog) {
      const palette = buildThemeTokens(theme.id);

      for (const key of REQUIRED_SEMANTIC_TOKEN_KEYS) {
        const value = palette.colors[key as keyof typeof palette.colors];
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses catalog preview chips from the same palette tokens as the live app", () => {
    // Terracotta Dusk picker preview uses linen mockup tokens; in-app palette differs.
    const refinedThemeIds = ["deep-forest", "midnight-ivy"] as const;

    for (const themeId of refinedThemeIds) {
      const definition = getThemeDefinition(themeId);
      const palette = buildThemeTokens(themeId);

      expect(definition.preview.surfaces.statusBackground).toBe(
        palette.colors.statusThriving,
      );
      expect(definition.preview.surfaces.border).toBe(
        palette.colors.suggestionCardBorder,
      );
    }
  });
});

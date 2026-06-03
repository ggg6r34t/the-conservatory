import {
  DEFAULT_THEME_ID,
  buildThemeTokens,
  formatThemeName,
  resolveThemeId,
  themeCatalog,
} from "@/features/theme/registry";

describe("theme registry", () => {
  it("exposes all mockup themes", () => {
    expect(themeCatalog.map((theme) => theme.id)).toEqual([
      "linen-light",
      "deep-forest",
      "midnight-ivy",
      "terracotta-dusk",
    ]);
  });

  it("falls back to linen light for unknown persisted values", () => {
    expect(resolveThemeId("sunset-glow")).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID);
  });

  it("builds tokens from a single source of truth per theme", () => {
    const deepForest = buildThemeTokens("deep-forest");
    expect(deepForest.colors.primaryContainer).toBe("#2d4f3e");
    expect(deepForest.spacing.md).toBe(16);
  });

  it("formats display names for profile settings", () => {
    expect(formatThemeName("midnight-ivy")).toBe("Midnight Ivy");
  });

  it("marks accessibility profiles as WCAG AA compliant", () => {
    for (const theme of themeCatalog) {
      expect(theme.accessibility.passesWcagAa).toBe(true);
    }
  });
});

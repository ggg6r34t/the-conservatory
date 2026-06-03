import {
  DEFAULT_THEME_ID,
  buildThemeTokens,
  clearThemeTokenCache,
  formatThemeName,
  resolveThemeId,
  themeCatalog,
} from "@/features/theme/registry";

describe("theme registry", () => {
  beforeEach(() => {
    clearThemeTokenCache();
  });

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
    expect(deepForest.colors.primaryContainer).toBe("#2f4f41");
    expect(deepForest.colors.statusThriving).toBe("#55694c");
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

  it("includes semantic tokens on every theme palette", () => {
    for (const theme of themeCatalog) {
      const palette = buildThemeTokens(theme.id);
      expect(palette.colors.statusThriving).toBeTruthy();
      expect(palette.colors.syncHealthy).toBeTruthy();
      expect(palette.colors.journalAccent).toBeTruthy();
      expect(palette.colors.shadow).toBeTruthy();
      expect(palette.colors.shadowElevated).toBeTruthy();
    }
  });

  it("keeps linen-light core colors unchanged", () => {
    const linen = buildThemeTokens("linen-light");
    expect(linen.colors.primary).toBe("#163828");
    expect(linen.colors.surface).toBe("#fbf9f4");
    expect(linen.colors.onSurface).toBe("#1b1c19");
  });
});

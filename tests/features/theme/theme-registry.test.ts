import {
  DEFAULT_THEME_ID,
  buildThemeTokens,
  clearThemeTokenCache,
  formatThemeName,
  getThemeDefinition,
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
    expect(deepForest.colors.primaryContainer).toBe("#2a4a3c");
    expect(deepForest.colors.statusThriving).toBe("#c8e2d4");
    expect(deepForest.colors.sheetBorder).toBeTruthy();
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

  it("gives terracotta-dusk its own palette (not linen-light core)", () => {
    const linen = buildThemeTokens("linen-light");
    const terracotta = buildThemeTokens("terracotta-dusk");
    const definition = getThemeDefinition("terracotta-dusk");

    expect(terracotta.colors.primary).not.toBe(linen.colors.primary);
    expect(terracotta.colors.background).not.toBe(linen.colors.background);
    expect(terracotta.colors.surface).not.toBe(linen.colors.surface);
    expect(definition.card.background).toBe("#ffdbcf");
    expect(definition.preview.surfaces.statusBackground).toBe(
      terracotta.colors.statusThriving,
    );
    expect(definition.card.selectionRing).toBe("#9a583c");
    expect(definition.card.selectionRing).not.toBe(linen.colors.primary);
  });
});

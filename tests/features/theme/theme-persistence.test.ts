import { resolveDisplayedPreferredThemeId } from "@/features/theme/services/displayPreferredTheme";
import { formatThemeName } from "@/features/theme/registry";

describe("theme persistence display", () => {
  it("derives profile labels from canonical theme ids", () => {
    expect(formatThemeName("deep-forest")).toBe("Deep Forest");
    expect(formatThemeName("midnight-ivy")).toBe("Midnight Ivy");
    expect(formatThemeName("terracotta-dusk")).toBe("Terracotta Dusk");
    expect(formatThemeName("linen-light")).toBe("Linen Light");
  });

  it("uses runtime theme after hydration", () => {
    expect(
      resolveDisplayedPreferredThemeId({
        activeThemeId: "deep-forest",
        hydrated: true,
        persistedThemeId: "linen-light",
      }),
    ).toBe("deep-forest");
  });

  it("falls back to persisted preference before hydration completes", () => {
    expect(
      resolveDisplayedPreferredThemeId({
        activeThemeId: "linen-light",
        hydrated: false,
        persistedThemeId: "terracotta-dusk",
      }),
    ).toBe("terracotta-dusk");
  });

  it("falls back to Linen Light for invalid theme ids", () => {
    expect(
      resolveDisplayedPreferredThemeId({
        activeThemeId: "linen-light",
        hydrated: true,
        persistedThemeId: "not-a-theme",
      }),
    ).toBe("linen-light");
  });
});

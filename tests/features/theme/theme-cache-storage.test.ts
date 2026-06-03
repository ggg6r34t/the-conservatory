import { DEFAULT_THEME_ID, resolveThemeId } from "@/features/theme/registry";
import { resolveBootstrapThemeId } from "@/features/theme/services/themeBootstrap";

describe("theme bootstrap resolution", () => {
  it("falls back to linen-light when cache and preference are absent", () => {
    expect(resolveBootstrapThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(resolveBootstrapThemeId(null, undefined)).toBe(DEFAULT_THEME_ID);
  });

  it("falls back to linen-light for invalid preference strings", () => {
    expect(resolveBootstrapThemeId(null, "sunset-glow")).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId("")).toBe(DEFAULT_THEME_ID);
  });

  it("uses valid cached theme when no server preference is available", () => {
    expect(resolveBootstrapThemeId("deep-forest")).toBe("deep-forest");
  });

  it("prefers server preference over cache when both are valid", () => {
    expect(resolveBootstrapThemeId("deep-forest", "midnight-ivy")).toBe(
      "midnight-ivy",
    );
  });

  it("reverts premium themes for free users when subscription snapshot is provided", () => {
    const free = { tier: "free" as const, period: null };
    expect(resolveBootstrapThemeId("deep-forest", null, free)).toBe(
      DEFAULT_THEME_ID,
    );
    expect(resolveBootstrapThemeId(null, "midnight-ivy", free)).toBe(
      DEFAULT_THEME_ID,
    );
  });

  it("allows premium themes for recurring subscribers", () => {
    const recurring = { tier: "premium" as const, period: "annual" as const };
    expect(resolveBootstrapThemeId(null, "deep-forest", recurring)).toBe(
      "deep-forest",
    );
  });

  it("blocks premium themes for lifetime entitlement", () => {
    const lifetime = { tier: "premium" as const, period: "lifetime" as const };
    expect(resolveBootstrapThemeId(null, "terracotta-dusk", lifetime)).toBe(
      DEFAULT_THEME_ID,
    );
  });
});

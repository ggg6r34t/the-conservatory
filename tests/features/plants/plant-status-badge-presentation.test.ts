import { tokens } from "@/styles/tokens";
import { buildThemeTokens } from "@/features/theme/registry";

import { getPlantStatusBadgePresentation } from "@/features/plants/services/plantStatusBadgePresentation";

describe("plantStatusBadgePresentation", () => {
  it("returns the canonical thriving presentation", () => {
    const presentation = getPlantStatusBadgePresentation({
      healthState: "thriving",
      colors: tokens.colors,
    });

    expect(presentation.label).toBe("THRIVING");
    expect(presentation.labelLines).toEqual(["THRIVING", ""]);
    expect(presentation.icon).toBe("leaf");
    expect(presentation.iconColor).toBe(tokens.colors.primary);
    expect(presentation.iconBackgroundColor).toBe(
      tokens.colors.primaryFixed,
    );
    expect(presentation.badgeBackgroundColor).toBe(
      tokens.colors.surfaceContainerLowest,
    );
    expect(presentation.badgeForegroundColor).toBe(tokens.colors.onSurface);
  });

  it("returns the canonical stable presentation", () => {
    const presentation = getPlantStatusBadgePresentation({
      healthState: "stable",
      colors: tokens.colors,
    });

    expect(presentation.label).toBe("STABLE");
    expect(presentation.labelLines).toEqual(["STABLE", ""]);
    expect(presentation.icon).toBe("leaf");
    expect(presentation.iconColor).toBe(tokens.colors.onSurfaceVariant);
    expect(presentation.iconBackgroundColor).toBe(
      tokens.colors.surfaceContainerHigh,
    );
  });

  it("uses clay peach compact fill for terracotta-dusk thriving", () => {
    const terracotta = buildThemeTokens("terracotta-dusk");
    const presentation = getPlantStatusBadgePresentation({
      healthState: "thriving",
      colors: terracotta.colors,
      themeId: "terracotta-dusk",
    });

    expect(presentation.badgeBackgroundColor).toBe("#f5ebe3");
    expect(presentation.badgeForegroundColor).toBe("#3a2216");
  });

  it("returns the canonical needs-attention presentation", () => {
    const presentation = getPlantStatusBadgePresentation({
      healthState: "needs_attention",
      colors: tokens.colors,
    });

    expect(presentation.label).toBe("NEEDS WATER");
    expect(presentation.labelLines).toEqual(["NEEDS", "WATER"]);
    expect(presentation.icon).toBe("water-alert");
    expect(presentation.iconColor).toBe(tokens.colors.error);
    expect(presentation.iconBackgroundColor).toBe(tokens.colors.errorContainer);
  });
});

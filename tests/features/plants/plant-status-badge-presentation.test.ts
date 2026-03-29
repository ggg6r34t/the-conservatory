import { tokens } from "@/styles/tokens";

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

import { blendColor, blendThemeColors } from "@/features/theme/services/themeColorTransition";
import { buildThemeTokens } from "@/features/theme/registry";

describe("theme color transition", () => {
  it("blends hex colors at the midpoint", () => {
    expect(blendColor("#000000", "#ffffff", 0.5)).toBe("rgba(128, 128, 128, 1)");
  });

  it("blends semantic surface tokens for animated transitions", () => {
    const from = buildThemeTokens("linen-light").colors;
    const to = buildThemeTokens("midnight-ivy").colors;
    const blended = blendThemeColors(from, to, 0.5);

    expect(blended.surface).not.toBe(from.surface);
    expect(blended.surface).not.toBe(to.surface);
  });
});

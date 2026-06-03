import { themeCatalog } from "@/features/theme/catalog";
import { getContrastRatio } from "@/features/theme/services/themeAccessibility";

describe("theme semantic contrast", () => {
  it("keeps readable status and body contrast on non-linen themes", () => {
    const nonLinen = themeCatalog.filter((theme) => theme.id !== "linen-light");

    for (const theme of nonLinen) {
      const { colors } = theme;

      expect(getContrastRatio(colors.onSurface, colors.surface)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        getContrastRatio(colors.onStatusThriving, colors.statusThriving),
      ).toBeGreaterThanOrEqual(3);
      expect(
        getContrastRatio(colors.onStatusNeedsWater, colors.statusNeedsWater),
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

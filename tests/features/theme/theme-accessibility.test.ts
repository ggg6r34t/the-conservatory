import { themeCatalog } from "@/features/theme/catalog";
import {
  getContrastRatio,
  buildThemeAccessibilityProfile,
} from "@/features/theme/services/themeAccessibility";

describe("theme accessibility", () => {
  it("computes WCAG contrast ratios from real color tokens", () => {
    const ratio = getContrastRatio("#1b1c19", "#fbf9f4");
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("validates every catalog theme against WCAG AA thresholds", () => {
    for (const theme of themeCatalog) {
      const profile = buildThemeAccessibilityProfile({
        colors: theme.colors,
        previewSurfaces: theme.preview.surfaces,
      });

      expect(profile.passesWcagAa).toBe(true);
      expect(profile.bodyContrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(profile.secondaryContrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(profile.statusChipContrastRatio).toBeGreaterThanOrEqual(3);
      expect(theme.accessibility.passesWcagAa).toBe(true);
    }
  });
});

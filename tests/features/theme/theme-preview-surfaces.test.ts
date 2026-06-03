import { themeCatalog } from "@/features/theme/catalog";
import { buildThemeTokens, getThemeDefinition } from "@/features/theme/registry";
import { resolveThrivingPreviewChip } from "@/features/theme/services/themePreviewSurfaces";

describe("theme preview surfaces", () => {
  it("matches compact thriving PlantStatusBadge colors for every catalog theme", () => {
    for (const theme of themeCatalog) {
      const palette = buildThemeTokens(theme.id);
      const definition = getThemeDefinition(theme.id);
      const expected = resolveThrivingPreviewChip(theme.id, palette.colors);

      expect(definition.preview.surfaces.statusBackground).toBe(
        expected.statusBackground,
      );
      expect(definition.preview.surfaces.statusForeground).toBe(
        expected.statusForeground,
      );
    }
  });
});

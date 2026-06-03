import { tokens as legacyDefaultTokens } from "@/styles/tokens";
import {
  DEFAULT_THEME_ID,
  buildThemeTokens,
  resolveThemeId,
} from "@/features/theme/registry";
import { resolveBootstrapThemeId } from "@/features/theme/services/themeBootstrap";
import { linenLightTheme } from "@/features/theme/definitions/linenLight";
import { getPlantStatusBadgePresentation } from "@/features/plants/services/plantStatusBadgePresentation";
import { botanicalSharedTokens } from "@/features/theme/tokens/shared";
import { withAlpha } from "@/features/theme/utils/withAlpha";

/** Core palette captured before multi-theme expansion (styles/tokens.ts @ a17a5d8^). */
const LINEN_LIGHT_BASELINE_CORE = {
  primary: "#163828",
  primaryContainer: "#2d4f3e",
  primaryFixed: "#c5ebd4",
  primaryFixedDim: "#a9cfb9",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#9ac0aa",
  onPrimaryFixed: "#002113",
  onPrimaryFixedVariant: "#2c4e3d",
  secondary: "#94492e",
  secondaryContainer: "#fd9e7c",
  secondaryOnContainer: "#77331a",
  secondaryFixed: "#ffdbcf",
  secondaryFixedDim: "#ffb59c",
  onSecondary: "#ffffff",
  onSecondaryContainer: "#77331a",
  onSecondaryFixed: "#390c00",
  onSecondaryFixedVariant: "#763219",
  tertiary: "#2a3521",
  tertiaryContainer: "#404c36",
  tertiaryFixed: "#dae7c9",
  tertiaryFixedDim: "#becbae",
  onTertiary: "#ffffff",
  onTertiaryContainer: "#afbca0",
  onTertiaryFixed: "#141e0c",
  onTertiaryFixedVariant: "#3f4a35",
  background: "#fbf9f4",
  onBackground: "#1b1c19",
  surface: "#fbf9f4",
  surfaceDim: "#dbdad5",
  surfaceBright: "#fbf9f4",
  surfaceVariant: "#e4e2dd",
  surfaceContainer: "#f0eee9",
  surfaceContainerLow: "#f5f3ee",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerHigh: "#eae8e3",
  surfaceContainerHighest: "#e4e2dd",
  surfaceTint: "#436653",
  onSurface: "#1b1c19",
  onSurfaceVariant: "#414844",
  inverseSurface: "#30312e",
  inverseOnSurface: "#f2f1ec",
  inversePrimary: "#a9cfb9",
  outline: "#727973",
  outlineVariant: "#c1c8c2",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onError: "#ffffff",
  onErrorContainer: "#93000a",
  backdrop: "rgba(27, 28, 25, 0.32)",
  transparent: "transparent",
  selectionCardBackground: "#ffffff",
} as const;

describe("Linen Light regression", () => {
  const linen = buildThemeTokens("linen-light");

  it("defaults unknown and missing preferences to linen-light", () => {
    expect(DEFAULT_THEME_ID).toBe("linen-light");
    expect(resolveThemeId(undefined)).toBe("linen-light");
    expect(resolveThemeId("not-a-theme")).toBe("linen-light");
    expect(resolveBootstrapThemeId(null)).toBe("linen-light");
    expect(resolveBootstrapThemeId(null, null)).toBe("linen-light");
    expect(resolveBootstrapThemeId(null, "bogus")).toBe("linen-light");
  });

  it("honors persisted linen-light preference", () => {
    expect(resolveBootstrapThemeId("midnight-ivy", "linen-light")).toBe(
      "linen-light",
    );
    expect(resolveThemeId("linen-light")).toBe("linen-light");
  });

  it("matches pre-expansion core color baseline", () => {
    for (const [key, value] of Object.entries(LINEN_LIGHT_BASELINE_CORE)) {
      expect(linen.colors[key as keyof typeof LINEN_LIGHT_BASELINE_CORE]).toBe(
        value,
      );
    }
  });

  it("keeps legacy styles/tokens.ts export aligned with linen-light registry", () => {
    for (const [key, value] of Object.entries(LINEN_LIGHT_BASELINE_CORE)) {
      expect(legacyDefaultTokens.colors[key as keyof typeof LINEN_LIGHT_BASELINE_CORE]).toBe(
        value,
      );
    }
  });

  it("preserves shared spacing, radius, typography, and elevation shadow", () => {
    expect(linen.spacing).toEqual(botanicalSharedTokens.spacing);
    expect(linen.radius).toEqual(botanicalSharedTokens.radius);
    expect(linen.typography).toEqual(botanicalSharedTokens.typography);
    expect(linen.shadow).toEqual(botanicalSharedTokens.shadow);
  });

  it("uses linen-specific semantic shadows without dark-theme leakage", () => {
    expect(linen.colors.shadow).toBe("rgba(27, 28, 25, 0.04)");
    expect(linen.colors.shadowElevated).toBe("rgba(27, 28, 25, 0.1)");
    expect(linenLightTheme.isDark).toBe(false);
  });

  it("preserves pre-expansion destructive and profile-edit overlay semantics", () => {
    expect(linen.colors.dangerGradientEnd).toBe("#8c1414");
    expect(linen.colors.photoEditOverlay).toBe(
      withAlpha(LINEN_LIGHT_BASELINE_CORE.backdrop, 0.45),
    );
    expect(linen.colors.sheetBorder).toBe(
      withAlpha(LINEN_LIGHT_BASELINE_CORE.surfaceContainerLowest, 0.72),
    );
  });

  it("shows the white thriving pill on the interface-theme preview card", () => {
    expect(linenLightTheme.preview.surfaces.statusBackground).toBe("#ffffff");
    expect(linenLightTheme.preview.surfaces.statusForeground).toBe("#1b1c19");

    const thriving = getPlantStatusBadgePresentation({
      healthState: "thriving",
      colors: linen.colors,
    });
    expect(linenLightTheme.preview.surfaces.statusBackground).toBe(
      thriving.badgeBackgroundColor,
    );
    expect(linenLightTheme.preview.surfaces.statusForeground).toBe(
      thriving.badgeForegroundColor,
    );
  });

  it("maps status badge presentation to the pre-expansion linen appearance", () => {
    const thriving = getPlantStatusBadgePresentation({
      healthState: "thriving",
      colors: linen.colors,
    });
    expect(thriving.iconColor).toBe("#163828");
    expect(thriving.iconBackgroundColor).toBe("#c5ebd4");
    expect(thriving.badgeBackgroundColor).toBe("#ffffff");
    expect(thriving.badgeForegroundColor).toBe("#1b1c19");

    const stable = getPlantStatusBadgePresentation({
      healthState: "stable",
      colors: linen.colors,
    });
    expect(stable.iconColor).toBe("#414844");
    expect(stable.iconBackgroundColor).toBe("#eae8e3");

    const needsWater = getPlantStatusBadgePresentation({
      healthState: "needs_attention",
      colors: linen.colors,
    });
    expect(needsWater.iconColor).toBe("#ba1a1a");
    expect(needsWater.iconBackgroundColor).toBe("#ffdad6");
  });
});

import type { BotanicalCoreTokens } from "@/features/theme/tokens/coreTokens";
import type { BotanicalSemanticTokens } from "@/features/theme/tokens/semanticTokens";
import { withAlpha } from "@/features/theme/utils/withAlpha";

export function deriveSemanticTokens(
  core: BotanicalCoreTokens,
  options: { isDark: boolean },
  overrides: Partial<BotanicalSemanticTokens> = {},
): BotanicalSemanticTokens {
  const base: BotanicalSemanticTokens = {
    scrim: core.backdrop,
    shadow: options.isDark
      ? "rgba(0, 0, 0, 0.28)"
      : "rgba(27, 28, 25, 0.04)",
    shadowElevated: options.isDark
      ? "rgba(0, 0, 0, 0.42)"
      : "rgba(27, 28, 25, 0.1)",

    success: core.primary,
    onSuccess: core.onPrimary,
    successContainer: core.primaryContainer,
    onSuccessContainer: core.onPrimaryContainer,

    warning: core.secondary,
    onWarning: core.onSecondary,
    warningContainer: core.secondaryContainer,
    onWarningContainer: core.onSecondaryContainer,

    info: core.primaryFixedDim,
    onInfo: core.onPrimaryFixed,
    infoContainer: core.primaryFixed,
    onInfoContainer: core.onPrimaryFixedVariant,

    statusThriving: core.secondaryFixed,
    onStatusThriving: core.primary,
    statusStable: core.surfaceContainerHigh,
    onStatusStable: core.onSurfaceVariant,
    statusNeedsWater: core.errorContainer,
    onStatusNeedsWater: core.onErrorContainer,
    statusDormant: core.outlineVariant,
    onStatusDormant: core.onSurfaceVariant,
    statusUnknown: core.surfaceVariant,
    onStatusUnknown: core.onSurfaceVariant,

    premium: core.primary,
    onPremium: core.onPrimary,
    premiumContainer: core.primaryContainer,
    onPremiumContainer: core.onPrimaryContainer,

    syncHealthy: core.primary,
    syncWarning: core.secondary,
    syncError: core.error,

    graveyardAccent: core.onSurfaceVariant,
    memorialAccent: core.secondary,
    journalAccent: core.tertiary,
    timelineAccent: core.primaryFixedDim,

    sheetBorder: withAlpha(core.surfaceContainerLowest, 0.72),
    sheetBorderMuted: withAlpha(core.surfaceContainerLowest, 0.44),
    overlayTint: withAlpha(core.surface, 0.38),
    overlayShade: withAlpha(core.onSurface, 0.06),
    overlayLight: withAlpha(core.backdrop, 0.18),
    surfaceGlow: withAlpha(core.surfaceContainerLowest, 0.14),
    borderSubtle: withAlpha(core.outlineVariant, 0.35),
    borderFrosted: withAlpha(core.surfaceContainerLowest, 0.74),

    onPrimaryOverlay: withAlpha(core.onPrimary, 0.12),
    onPrimaryHighlight: withAlpha(core.onPrimary, 0.18),
    onPrimaryBorder: withAlpha(core.onPrimary, 0.7),

    imageOverlay: withAlpha(core.surface, 0.5),
    heroImageFadeEnd: withAlpha(core.surface, 0.86),

    premiumHeroOverlay: withAlpha(core.primary, 0.58),
    premiumPanelOverlay: withAlpha(core.primaryContainer, 0.42),
    backupHeroOverlay: withAlpha(core.primary, 0.42),
    highlightChipBackground: withAlpha(core.surfaceContainerLowest, 0.88),
    memorialReflectionBorder: withAlpha(core.secondary, 0.12),
    suggestionCardBorder: withAlpha(core.outlineVariant, 0.25),

    dangerGradientEnd: core.onErrorContainer,
  };

  return { ...base, ...overrides };
}

export function buildThemePalette(
  core: BotanicalCoreTokens,
  options: { isDark: boolean },
  semanticOverrides?: Partial<BotanicalSemanticTokens>,
) {
  return {
    ...core,
    ...deriveSemanticTokens(core, options, semanticOverrides),
  };
}

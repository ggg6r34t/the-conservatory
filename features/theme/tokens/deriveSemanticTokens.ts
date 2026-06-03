import type { BotanicalCoreTokens } from "@/features/theme/tokens/coreTokens";
import type { BotanicalSemanticTokens } from "@/features/theme/tokens/semanticTokens";

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

/** App-wide semantic colors derived per theme (status, sync, domain accents, overlays). */
export type BotanicalSemanticTokens = {
  scrim: string;
  /** Subtle elevation shadow (cards, surface buttons). */
  shadow: string;
  /** Stronger elevation shadow (floating badges, emphasis controls). */
  shadowElevated: string;

  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;

  info: string;
  onInfo: string;
  infoContainer: string;
  onInfoContainer: string;

  statusThriving: string;
  onStatusThriving: string;
  statusStable: string;
  onStatusStable: string;
  statusNeedsWater: string;
  onStatusNeedsWater: string;
  statusDormant: string;
  onStatusDormant: string;
  statusUnknown: string;
  onStatusUnknown: string;

  premium: string;
  onPremium: string;
  premiumContainer: string;
  onPremiumContainer: string;

  syncHealthy: string;
  syncWarning: string;
  syncError: string;

  graveyardAccent: string;
  memorialAccent: string;
  journalAccent: string;
  timelineAccent: string;

  /** Modal / sheet chrome */
  sheetBorder: string;
  sheetBorderMuted: string;
  overlayTint: string;
  overlayShade: string;
  overlayLight: string;
  surfaceGlow: string;
  borderSubtle: string;
  borderFrosted: string;

  /** Controls on filled primary surfaces */
  onPrimaryOverlay: string;
  onPrimaryHighlight: string;
  onPrimaryBorder: string;

  /** Imagery */
  imageOverlay: string;
  heroImageFadeEnd: string;

  /** Marketing / premium surfaces */
  premiumHeroOverlay: string;
  premiumPanelOverlay: string;
  backupHeroOverlay: string;
  highlightChipBackground: string;
  memorialReflectionBorder: string;
  suggestionCardBorder: string;

  /** Destructive CTA gradient end */
  dangerGradientEnd: string;
};

/** Required semantic keys — used by completeness tests. */
export const REQUIRED_SEMANTIC_TOKEN_KEYS = [
  "scrim",
  "shadow",
  "shadowElevated",
  "success",
  "onSuccess",
  "successContainer",
  "onSuccessContainer",
  "warning",
  "onWarning",
  "warningContainer",
  "onWarningContainer",
  "info",
  "onInfo",
  "infoContainer",
  "onInfoContainer",
  "statusThriving",
  "onStatusThriving",
  "statusStable",
  "onStatusStable",
  "statusNeedsWater",
  "onStatusNeedsWater",
  "statusDormant",
  "onStatusDormant",
  "statusUnknown",
  "onStatusUnknown",
  "premium",
  "onPremium",
  "premiumContainer",
  "onPremiumContainer",
  "syncHealthy",
  "syncWarning",
  "syncError",
  "graveyardAccent",
  "memorialAccent",
  "journalAccent",
  "timelineAccent",
  "sheetBorder",
  "sheetBorderMuted",
  "overlayTint",
  "overlayShade",
  "overlayLight",
  "surfaceGlow",
  "borderSubtle",
  "borderFrosted",
  "onPrimaryOverlay",
  "onPrimaryHighlight",
  "onPrimaryBorder",
  "imageOverlay",
  "heroImageFadeEnd",
  "premiumHeroOverlay",
  "premiumPanelOverlay",
  "backupHeroOverlay",
  "highlightChipBackground",
  "memorialReflectionBorder",
  "suggestionCardBorder",
  "dangerGradientEnd",
] as const satisfies readonly (keyof BotanicalSemanticTokens)[];

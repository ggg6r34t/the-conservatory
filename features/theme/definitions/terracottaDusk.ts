import type { ThemeDefinition } from "@/features/theme/types";
import { buildThemePalette } from "@/features/theme/tokens/deriveSemanticTokens";
import { resolveThrivingPreviewChip } from "@/features/theme/services/themePreviewSurfaces";
import { withAlpha } from "@/features/theme/utils/withAlpha";

/**
 * Mediterranean twilight — warm sand surfaces, olive sage primary, clay terracotta accents.
 * Distinct from Linen Light (cool cream + forest green). Picker and in-app share this palette.
 */
const terracottaCore = {
  primary: "#3d5348",
  primaryContainer: "#4f6658",
  primaryFixed: "#b5d1c0",
  primaryFixedDim: "#98b5a4",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#d8e8dc",
  onPrimaryFixed: "#192b22",
  onPrimaryFixedVariant: "#354a3f",
  secondary: "#9a583c",
  secondaryContainer: "#c97854",
  secondaryOnContainer: "#5a3018",
  /** Thriving badges — warm dusk cream (distinct from Linen white and card shell peach). */
  secondaryFixed: "#f5ebe3",
  secondaryFixedDim: "#ead4c8",
  onSecondary: "#ffffff",
  onSecondaryContainer: "#5a3018",
  onSecondaryFixed: "#3a2216",
  onSecondaryFixedVariant: "#6a4836",
  tertiary: "#5a4a38",
  tertiaryContainer: "#726050",
  tertiaryFixed: "#e8dcc8",
  tertiaryFixedDim: "#cfc0ac",
  onTertiary: "#fffaf6",
  onTertiaryContainer: "#e0d4c4",
  onTertiaryFixed: "#2a1e14",
  onTertiaryFixedVariant: "#524636",
  background: "#eee2d6",
  onBackground: "#352218",
  surface: "#f0e4d8",
  surfaceDim: "#dcc9b8",
  surfaceBright: "#faf5ef",
  surfaceVariant: "#e4d4c6",
  surfaceContainer: "#ebe1d6",
  surfaceContainerLow: "#efe5da",
  surfaceContainerLowest: "#faf5ef",
  surfaceContainerHigh: "#e0d0c0",
  surfaceContainerHighest: "#d2c0b0",
  surfaceTint: "#9a583c",
  onSurface: "#352218",
  onSurfaceVariant: "#5a4436",
  inverseSurface: "#352218",
  inverseOnSurface: "#eee2d6",
  inversePrimary: "#98b5a4",
  outline: "#8f7464",
  outlineVariant: "#c9b4a4",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onError: "#ffffff",
  onErrorContainer: "#93000a",
  backdrop: "rgba(53, 34, 24, 0.32)",
  transparent: "transparent",
  /** Interface Theme card shell — dusk clay (not Linen secondary-fixed). */
  selectionCardBackground: "#ffdbcf",
} as const;

const terracottaColors = buildThemePalette(terracottaCore, { isDark: false }, {
  statusStable: terracottaCore.surfaceContainerHigh,
  onStatusStable: terracottaCore.onSurfaceVariant,
  memorialAccent: terracottaCore.secondary,
  journalAccent: terracottaCore.primary,
  dangerGradientEnd: "#7a1515",
});

const terracottaThrivingPreview = resolveThrivingPreviewChip(
  "terracotta-dusk",
  terracottaColors,
);

export const terracottaDuskTheme: ThemeDefinition = {
  id: "terracotta-dusk",
  name: "Terracotta Dusk",
  description: "The warmth of a Mediterranean garden at twilight.",
  access: "premium",
  category: "warm",
  isDark: false,
  quote: "Earth and clay remember the sun long after it has set.",
  colors: terracottaColors,
  preview: {
    plantTitle: "Cactus",
    statusLabel: "Thriving",
    image: require("@/assets/images/pilea-peperomioides.png"),
    imageOpacity: 0.92,
    surfaces: {
      background: withAlpha(terracottaCore.surfaceContainerLow, 0.62),
      border: terracottaColors.suggestionCardBorder,
      plantTitle: terracottaCore.primary,
      statusBackground: terracottaThrivingPreview.statusBackground,
      statusForeground: terracottaThrivingPreview.statusForeground,
      placeholderPrimary: withAlpha(terracottaCore.onSecondaryFixed, 0.08),
      placeholderSecondary: withAlpha(terracottaCore.onSecondaryFixed, 0.05),
    },
  },
  card: {
    background: terracottaCore.selectionCardBackground,
    title: terracottaCore.onSecondaryFixed,
    description: terracottaCore.onSecondaryFixedVariant,
    editorialLabel: terracottaCore.secondary,
    editorialQuote: terracottaCore.onSecondaryFixedVariant,
    selectionRing: terracottaCore.secondary,
    selectionFill: terracottaCore.secondary,
    selectionIcon: terracottaCore.onSecondary,
    unselectedRing: withAlpha(terracottaCore.onSecondaryFixedVariant, 0.32),
    editorialDivider: withAlpha(terracottaCore.onSecondaryFixedVariant, 0.12),
  },
  accessibility: {
    passesWcagAa: true,
    bodyContrastRatio: 0,
    secondaryContrastRatio: 0,
    statusChipContrastRatio: 0,
    notes: [],
  },
};

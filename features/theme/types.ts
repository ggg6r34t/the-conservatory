import type { ImageSourcePropType } from "react-native";

import type { BotanicalSharedTokens } from "./tokens/shared";

export type BotanicalColorTokens = {
  primary: string;
  primaryContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  onPrimary: string;
  onPrimaryContainer: string;
  onPrimaryFixed: string;
  onPrimaryFixedVariant: string;
  secondary: string;
  secondaryContainer: string;
  secondaryOnContainer: string;
  secondaryFixed: string;
  secondaryFixedDim: string;
  onSecondary: string;
  onSecondaryContainer: string;
  onSecondaryFixed: string;
  onSecondaryFixedVariant: string;
  tertiary: string;
  tertiaryContainer: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;
  onTertiary: string;
  onTertiaryContainer: string;
  onTertiaryFixed: string;
  onTertiaryFixedVariant: string;
  background: string;
  onBackground: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceTint: string;
  onSurface: string;
  onSurfaceVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  outline: string;
  outlineVariant: string;
  error: string;
  errorContainer: string;
  onError: string;
  onErrorContainer: string;
  backdrop: string;
  transparent: string;
};

export const THEME_IDS = [
  "linen-light",
  "deep-forest",
  "midnight-ivy",
  "terracotta-dusk",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeCategory = "light" | "dark" | "warm";

export interface ThemeAccessibilityProfile {
  passesWcagAa: boolean;
  bodyContrastRatio: number;
  secondaryContrastRatio: number;
  statusChipContrastRatio: number;
  notes: string[];
}

export interface ThemePreviewSurfaceTokens {
  background: string;
  border: string;
  plantTitle: string;
  statusBackground: string;
  statusForeground: string;
  placeholderPrimary: string;
  placeholderSecondary: string;
}

export interface ThemePreviewConfig {
  plantTitle: string;
  statusLabel: string;
  image: ImageSourcePropType;
  imageOpacity?: number;
  surfaces: ThemePreviewSurfaceTokens;
}

export interface ThemeCardPresentation {
  background: string;
  title: string;
  description: string;
  editorialLabel: string;
  editorialQuote: string;
  selectionRing: string;
  selectionFill: string;
  selectionIcon: string;
  unselectedRing: string;
  editorialDivider: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  category: ThemeCategory;
  isDark: boolean;
  quote: string;
  colors: BotanicalColorTokens;
  preview: ThemePreviewConfig;
  card: ThemeCardPresentation;
  accessibility: ThemeAccessibilityProfile;
}

export type BotanicalTokens = BotanicalSharedTokens & {
  colors: BotanicalColorTokens;
};

/** Scalable theme-system aliases */
export type ThemeTokens = BotanicalTokens;
export type ThemePreview = ThemePreviewConfig;
export type ThemeMetadata = Pick<
  ThemeDefinition,
  "id" | "name" | "description" | "category" | "isDark" | "quote"
>;

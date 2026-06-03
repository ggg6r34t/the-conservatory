import type { ImageSourcePropType } from "react-native";

import type { BotanicalCoreTokens } from "@/features/theme/tokens/coreTokens";
import type { BotanicalSemanticTokens } from "@/features/theme/tokens/semanticTokens";
import type { BotanicalSharedTokens } from "./tokens/shared";

export type BotanicalColorTokens = BotanicalCoreTokens & BotanicalSemanticTokens;

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

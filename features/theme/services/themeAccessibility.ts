import type { BotanicalColorTokens } from "@/features/theme/tokens/colorTokens";
import type {
  ThemeAccessibilityProfile,
  ThemePreviewSurfaceTokens,
} from "@/features/theme/types";

const WCAG_AA_BODY = 4.5;
const WCAG_AA_LARGE = 3;

function parseRgb(color: string): [number, number, number] | null {
  const normalized = color.trim();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const rgba = normalized.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/,
  );
  if (!rgba) {
    return null;
  }

  const alpha = rgba[4] ? Number(rgba[4]) : 1;
  if (alpha < 0.5) {
    return null;
  }

  return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
  );
}

export function getContrastRatio(foreground: string, background: string): number {
  const fg = parseRgb(foreground);
  const bg = parseRgb(background);

  if (!fg || !bg) {
    return 0;
  }

  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

export function buildThemeAccessibilityProfile(input: {
  colors: BotanicalColorTokens;
  previewSurfaces: ThemePreviewSurfaceTokens;
}): ThemeAccessibilityProfile {
  const bodyContrastRatio = getContrastRatio(
    input.colors.onSurface,
    input.colors.surface,
  );
  const secondaryContrastRatio = getContrastRatio(
    input.colors.onSurfaceVariant,
    input.colors.surface,
  );
  const statusChipContrastRatio = getContrastRatio(
    input.previewSurfaces.statusForeground,
    input.previewSurfaces.statusBackground,
  );
  const primaryOnBackground = getContrastRatio(
    input.colors.primary,
    input.colors.surface,
  );

  const notes: string[] = [];

  if (bodyContrastRatio < WCAG_AA_BODY) {
    notes.push(
      `Body text contrast ${bodyContrastRatio.toFixed(2)}:1 is below WCAG AA ${WCAG_AA_BODY}:1.`,
    );
  }

  if (secondaryContrastRatio < WCAG_AA_BODY) {
    notes.push(
      `Secondary text contrast ${secondaryContrastRatio.toFixed(2)}:1 is below WCAG AA ${WCAG_AA_BODY}:1.`,
    );
  }

  if (statusChipContrastRatio < WCAG_AA_LARGE) {
    notes.push(
      `Status chip contrast ${statusChipContrastRatio.toFixed(2)}:1 is below WCAG AA large text ${WCAG_AA_LARGE}:1.`,
    );
  }

  if (primaryOnBackground < WCAG_AA_LARGE) {
    notes.push(
      `Primary accent contrast ${primaryOnBackground.toFixed(2)}:1 is below WCAG AA large text ${WCAG_AA_LARGE}:1.`,
    );
  }

  return {
    passesWcagAa: notes.length === 0,
    bodyContrastRatio: Number(bodyContrastRatio.toFixed(2)),
    secondaryContrastRatio: Number(secondaryContrastRatio.toFixed(2)),
    statusChipContrastRatio: Number(statusChipContrastRatio.toFixed(2)),
    notes,
  };
}

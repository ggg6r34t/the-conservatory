import type { BotanicalColorTokens } from "@/features/theme/tokens/colorTokens";

function parseHexColor(color: string): [number, number, number, number] | null {
  const normalized = color.trim();
  if (normalized.startsWith("rgba")) {
    const match = normalized.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/,
    );
    if (!match) {
      return null;
    }
    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      match[4] ? Number(match[4]) : 1,
    ];
  }

  if (!normalized.startsWith("#")) {
    return null;
  }

  const hex = normalized.slice(1);
  if (hex.length === 3) {
    return [
      Number.parseInt(hex[0] + hex[0], 16),
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16),
      1,
    ];
  }

  if (hex.length === 6 || hex.length === 8) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
    ];
  }

  return null;
}

function toRgba([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
}

export function blendColor(
  fromColor: string,
  toColor: string,
  progress: number,
): string {
  const from = parseHexColor(fromColor);
  const to = parseHexColor(toColor);

  if (!from || !to) {
    return progress >= 0.5 ? toColor : fromColor;
  }

  const t = Math.min(1, Math.max(0, progress));
  return toRgba([
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ]);
}

const TRANSITION_KEYS = [
  "background",
  "surface",
  "surfaceContainer",
  "surfaceContainerLow",
  "surfaceContainerLowest",
  "surfaceContainerHigh",
  "surfaceBright",
  "primary",
  "onSurface",
  "onSurfaceVariant",
  "onPrimary",
  "primaryContainer",
  "inverseSurface",
  "inverseOnSurface",
] as const satisfies readonly (keyof BotanicalColorTokens)[];

export function blendThemeColors(
  from: BotanicalColorTokens,
  to: BotanicalColorTokens,
  progress: number,
): BotanicalColorTokens {
  const blended = { ...to };

  for (const key of TRANSITION_KEYS) {
    blended[key] = blendColor(from[key], to[key], progress);
  }

  return blended;
}

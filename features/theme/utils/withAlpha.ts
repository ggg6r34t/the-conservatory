function parseRgbChannels(color: string): [number, number, number] | null {
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

  const match = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Applies alpha to a theme hex/rgb color for borders, scrims, and overlays. */
export function withAlpha(
  color: string | undefined | null,
  alpha: number,
): string {
  if (!color) {
    return `rgba(0, 0, 0, ${Math.min(1, Math.max(0, alpha))})`;
  }

  const channels = parseRgbChannels(color);
  if (!channels) {
    return color;
  }

  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${clamped})`;
}

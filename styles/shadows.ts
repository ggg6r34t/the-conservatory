import type { ViewStyle } from "react-native";

import { tokens } from "@/styles/tokens";

type ShadowStyle = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

const defaultShadowColor = tokens.shadow.shadowColor;

export const shadowScale = {
  subtleSurface: {
    shadowColor: defaultShadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 1,
  },
  elevatedCard: {
    shadowColor: defaultShadowColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 2,
  },
  floatingSheet: {
    shadowColor: defaultShadowColor,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.1,
    shadowRadius: 42,
    elevation: 10,
  },
  modalCard: {
    shadowColor: defaultShadowColor,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 48,
    elevation: 12,
  },
} as const satisfies Record<string, ShadowStyle>;

export function shadowWithColor(
  shadow: ShadowStyle,
  shadowColor?: string,
): ShadowStyle {
  if (!shadowColor) {
    return shadow;
  }

  return {
    ...shadow,
    shadowColor,
  };
}

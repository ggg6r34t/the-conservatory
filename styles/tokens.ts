export const tokens = {
  colors: {
    primary: "#163828",
    primaryContainer: "#2d4f3e",
    primaryFixed: "#afbca0",
    secondary: "#fd9e7c",
    secondaryContainer: "#ffe0d4",
    secondaryOnContainer: "#77331a",
    tertiaryContainer: "#404c36",
    surface: "#fbf9f4",
    surfaceBright: "#ffffff",
    surfaceContainerLow: "#f5f3ee",
    surfaceContainerLowest: "#ffffff",
    surfaceContainerHigh: "#eae8e3",
    onSurface: "#1b1c19",
    onSurfaceVariant: "#5f655f",
    outline: "#9aa198",
    error: "#ba1a1a",
    backdrop: "rgba(27, 28, 25, 0.32)",
    transparent: "transparent",
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    section: 48,
  },
  radius: {
    sm: 14,
    md: 20,
    lg: 28,
    pill: 999,
  },
  typography: {
    display: {
      fontFamily: "NotoSerif_700Bold",
      fontSize: 56,
      lineHeight: 62,
    },
    headline: {
      fontFamily: "NotoSerif_700Bold",
      fontSize: 34,
      lineHeight: 40,
    },
    title: {
      fontFamily: "NotoSerif_700Bold",
      fontSize: 26,
      lineHeight: 32,
    },
    body: {
      fontFamily: "Manrope_500Medium",
      fontSize: 16,
      lineHeight: 24,
    },
    label: {
      fontFamily: "Manrope_700Bold",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 2,
    },
  },
  shadow: {
    shadowColor: "rgba(27, 28, 25, 0.04)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 0,
  },
} as const;

export type BotanicalTokens = typeof tokens;

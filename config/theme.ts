import { MD3LightTheme, type MD3Theme } from "react-native-paper";

import { tokens } from "@/styles/tokens";

export const botanicalPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: tokens.radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: tokens.colors.primary,
    onPrimary: tokens.colors.surfaceBright,
    primaryContainer: tokens.colors.primaryContainer,
    onPrimaryContainer: tokens.colors.surfaceBright,
    secondary: tokens.colors.secondary,
    onSecondary: tokens.colors.secondaryOnContainer,
    secondaryContainer: tokens.colors.secondaryContainer,
    onSecondaryContainer: tokens.colors.secondaryOnContainer,
    background: tokens.colors.surface,
    surface: tokens.colors.surface,
    surfaceVariant: tokens.colors.surfaceContainerLow,
    surfaceDisabled: tokens.colors.surfaceContainerHigh,
    onSurface: tokens.colors.onSurface,
    onSurfaceVariant: tokens.colors.onSurfaceVariant,
    outline: tokens.colors.outline,
    error: tokens.colors.error,
  },
};

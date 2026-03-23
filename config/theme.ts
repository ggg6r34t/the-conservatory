import { MD3LightTheme, type MD3Theme } from "react-native-paper";

import { tokens } from "@/styles/tokens";

export const botanicalPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: tokens.radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: tokens.colors.primary,
    onPrimary: tokens.colors.onPrimary,
    primaryContainer: tokens.colors.primaryContainer,
    onPrimaryContainer: tokens.colors.onPrimaryContainer,
    secondary: tokens.colors.secondary,
    onSecondary: tokens.colors.onSecondary,
    secondaryContainer: tokens.colors.secondaryContainer,
    onSecondaryContainer: tokens.colors.onSecondaryContainer,
    background: tokens.colors.background,
    surface: tokens.colors.surface,
    surfaceVariant: tokens.colors.surfaceVariant,
    surfaceDisabled: tokens.colors.surfaceContainerHigh,
    onSurface: tokens.colors.onSurface,
    onSurfaceVariant: tokens.colors.onSurfaceVariant,
    outline: tokens.colors.outline,
    error: tokens.colors.error,
    onError: tokens.colors.onError,
    errorContainer: tokens.colors.errorContainer,
    onErrorContainer: tokens.colors.onErrorContainer,
    inverseSurface: tokens.colors.inverseSurface,
    inverseOnSurface: tokens.colors.inverseOnSurface,
    inversePrimary: tokens.colors.inversePrimary,
    backdrop: tokens.colors.backdrop,
  },
};

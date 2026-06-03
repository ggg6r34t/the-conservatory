import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { linenLightTheme } from "@/features/theme/definitions/linenLight";
import type { BotanicalColorTokens } from "@/features/theme/tokens/colorTokens";

export function createBotanicalPaperTheme(
  colors: BotanicalColorTokens,
  isDark = false,
): MD3Theme {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    dark: base.dark,
    roundness: 20,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryContainer,
      onPrimaryContainer: colors.onPrimaryContainer,
      secondary: colors.secondary,
      onSecondary: colors.onSecondary,
      secondaryContainer: colors.secondaryContainer,
      onSecondaryContainer: colors.onSecondaryContainer,
      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceVariant,
      surfaceDisabled: colors.surfaceContainerHigh,
      onSurface: colors.onSurface,
      onSurfaceVariant: colors.onSurfaceVariant,
      outline: colors.outline,
      error: colors.error,
      onError: colors.onError,
      errorContainer: colors.errorContainer,
      onErrorContainer: colors.onErrorContainer,
      inverseSurface: colors.inverseSurface,
      inverseOnSurface: colors.inverseOnSurface,
      inversePrimary: colors.inversePrimary,
      backdrop: colors.backdrop,
    },
  };
}

export const botanicalPaperTheme = createBotanicalPaperTheme(
  linenLightTheme.colors,
);

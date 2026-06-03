import { deepForestTheme } from "@/features/theme/definitions/deepForest";
import { linenLightTheme } from "@/features/theme/definitions/linenLight";
import { midnightIvyTheme } from "@/features/theme/definitions/midnightIvy";
import { terracottaDuskTheme } from "@/features/theme/definitions/terracottaDusk";
import { enrichThemeDefinition } from "@/features/theme/services/enrichThemeDefinition";
import type { ThemeDefinition, ThemeId } from "@/features/theme/types";

export const DEFAULT_THEME_ID: ThemeId = "linen-light";

const rawThemeCatalog = [
  linenLightTheme,
  deepForestTheme,
  midnightIvyTheme,
  terracottaDuskTheme,
] as const;

export const themeCatalog: readonly ThemeDefinition[] = rawThemeCatalog.map(
  enrichThemeDefinition,
);

export const themeCatalogById: Record<ThemeId, ThemeDefinition> =
  themeCatalog.reduce(
    (accumulator, theme) => {
      accumulator[theme.id] = theme;
      return accumulator;
    },
    {} as Record<ThemeId, ThemeDefinition>,
  );

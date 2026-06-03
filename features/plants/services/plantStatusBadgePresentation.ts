import type { BotanicalThemeValue } from "@/components/design-system/Theme";
import type { ThemeId } from "@/features/theme/types";

import type { PlantHealthState } from "./plantStatusService";
import { getPlantStatusLabel } from "./plantStatusService";

type ThemeColors = BotanicalThemeValue["colors"];

function usesWarmThrivingCompactBadge(themeId?: ThemeId): boolean {
  return themeId === "terracotta-dusk";
}

export type PlantStatusBadgeLabel = "THRIVING" | "STABLE" | "NEEDS WATER";

export interface PlantStatusBadgePresentation {
  healthState: PlantHealthState;
  label: PlantStatusBadgeLabel;
  labelLines: readonly [string, string];
  icon: "leaf" | "water-alert";
  iconColor: string;
  iconBackgroundColor: string;
  labelColor: string;
  badgeBackgroundColor: string;
  badgeForegroundColor: string;
  emphasisColor: string;
}

/** Linen Light baseline mappings; core tokens preserve pre–multi-theme appearance. */
export function getPlantStatusBadgePresentation(input: {
  healthState: PlantHealthState;
  colors: ThemeColors;
  themeId?: ThemeId;
}): PlantStatusBadgePresentation {
  const label = getPlantStatusLabel(input.healthState);
  const { colors, themeId } = input;
  const warmThrivingBadge = usesWarmThrivingCompactBadge(themeId);

  if (input.healthState === "needs_attention") {
    return {
      healthState: input.healthState,
      label,
      labelLines: ["NEEDS", "WATER"],
      icon: "water-alert",
      iconColor: colors.error,
      iconBackgroundColor: colors.errorContainer,
      labelColor: colors.onSurface,
      badgeBackgroundColor: colors.surfaceContainerLowest,
      badgeForegroundColor: colors.onSurface,
      emphasisColor: colors.error,
    };
  }

  if (input.healthState === "thriving") {
    return {
      healthState: input.healthState,
      label,
      labelLines: [label, ""],
      icon: "leaf",
      iconColor: colors.primary,
      iconBackgroundColor: colors.primaryFixed,
      labelColor: colors.onSurface,
      badgeBackgroundColor: warmThrivingBadge
        ? colors.secondaryFixed
        : colors.surfaceContainerLowest,
      badgeForegroundColor: warmThrivingBadge
        ? colors.onSecondaryFixed
        : colors.onSurface,
      emphasisColor: colors.primary,
    };
  }

  return {
    healthState: input.healthState,
    label,
    labelLines: [label, ""],
    icon: "leaf",
    iconColor: colors.onSurfaceVariant,
    iconBackgroundColor: colors.surfaceContainerHigh,
    labelColor: colors.onSurface,
    badgeBackgroundColor: colors.surfaceContainerLowest,
    badgeForegroundColor: colors.onSurface,
    emphasisColor: colors.onSurfaceVariant,
  };
}

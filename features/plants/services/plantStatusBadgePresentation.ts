import type { BotanicalThemeValue } from "@/components/design-system/Theme";

import type { PlantHealthState } from "./plantStatusService";
import { getPlantStatusLabel } from "./plantStatusService";

type ThemeColors = BotanicalThemeValue["colors"];

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

export function getPlantStatusBadgePresentation(input: {
  healthState: PlantHealthState;
  colors: ThemeColors;
}): PlantStatusBadgePresentation {
  const label = getPlantStatusLabel(input.healthState);

  if (input.healthState === "needs_attention") {
    return {
      healthState: input.healthState,
      label,
      labelLines: ["NEEDS", "WATER"],
      icon: "water-alert",
      iconColor: input.colors.error,
      iconBackgroundColor: input.colors.errorContainer,
      labelColor: input.colors.onSurface,
      badgeBackgroundColor: input.colors.errorContainer,
      badgeForegroundColor: input.colors.onErrorContainer,
      emphasisColor: input.colors.error,
    };
  }

  if (input.healthState === "thriving") {
    return {
      healthState: input.healthState,
      label,
      labelLines: [label, ""],
      icon: "leaf",
      iconColor: input.colors.primary,
      iconBackgroundColor: input.colors.secondaryFixed,
      labelColor: input.colors.onSurface,
      badgeBackgroundColor: input.colors.secondaryFixed,
      badgeForegroundColor: input.colors.primary,
      emphasisColor: input.colors.primary,
    };
  }

  return {
    healthState: input.healthState,
    label,
    labelLines: [label, ""],
    icon: "leaf",
    iconColor: input.colors.onSurfaceVariant,
    iconBackgroundColor: input.colors.surfaceContainerHigh,
    labelColor: input.colors.onSurface,
    badgeBackgroundColor: input.colors.surfaceContainerHigh,
    badgeForegroundColor: input.colors.onSurfaceVariant,
    emphasisColor: input.colors.onSurfaceVariant,
  };
}

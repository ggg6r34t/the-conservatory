import { getPlantStatusBadgePresentation } from "@/features/plants/services/plantStatusBadgePresentation";
import type { BotanicalColorTokens } from "@/features/theme/tokens/colorTokens";
import type { ThemeId } from "@/features/theme/types";

/** Interface Theme preview chip — matches compact PlantStatusBadge thriving colors. */
export function resolveThrivingPreviewChip(
  themeId: ThemeId,
  colors: BotanicalColorTokens,
) {
  const presentation = getPlantStatusBadgePresentation({
    healthState: "thriving",
    colors,
    themeId,
  });

  return {
    statusBackground: presentation.badgeBackgroundColor,
    statusForeground: presentation.badgeForegroundColor,
  };
}

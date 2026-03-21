import { useContext } from "react";

import { BotanicalThemeContext } from "@/components/design-system/Theme";

export function useTheme() {
  return useContext(BotanicalThemeContext);
}

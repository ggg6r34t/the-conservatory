import { buildThemeTokens } from "@/features/theme/registry";

/** Default export remains linen-light for static imports and tests. */
export const tokens = buildThemeTokens("linen-light");

export type { BotanicalTokens } from "@/features/theme/types";

import { useCallback } from "react";

import { useAccountRequiredPrompt } from "@/features/auth/hooks/useAccountRequiredPrompt";

export function useGuestCloudAiPrompt() {
  const { isGuest, promptIfGuestRestricted } = useAccountRequiredPrompt();

  const promptIfGuestCloudAi = useCallback(
    async (returnTo?: string) => {
      if (!isGuest) {
        return true;
      }

      return promptIfGuestRestricted({
        feature: "cloud_ai",
        returnTo: returnTo ?? "/(tabs)",
        reason: "cloud_ai_requires_account",
      });
    },
    [isGuest, promptIfGuestRestricted],
  );

  return { isGuest, promptIfGuestCloudAi };
}

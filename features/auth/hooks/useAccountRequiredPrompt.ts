import { useRouter } from "expo-router";
import { useCallback } from "react";

import type { GuestFeature } from "@/features/auth/types/authMode";
import {
  canUseFeatureAsGuest,
  getAccountRequiredCopy,
} from "@/features/auth/services/guestFeatureAccess";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAlert } from "@/hooks/useAlert";
import { trackEvent } from "@/services/analytics/analyticsService";

type PromptOptions = {
  feature: GuestFeature;
  returnTo?: string;
  reason?: string;
};

export function useAccountRequiredPrompt() {
  const alert = useAlert();
  const router = useRouter();
  const { isGuest } = useAuth();

  const promptIfGuestRestricted = useCallback(
    async (options: PromptOptions) => {
      const access = canUseFeatureAsGuest(options.feature, { isGuest });
      if (access.canUse) {
        return true;
      }

      const copy = getAccountRequiredCopy(options.feature);
      trackEvent("guest_account_required_prompt_shown", {
        feature: options.feature,
        reason: options.reason ?? null,
      });

      const result = await alert.show({
        variant: "info",
        title: copy.title,
        message: copy.message,
        primaryAction: { label: "Create account", tone: "primary" },
        secondaryAction: { label: "Not now" },
        analyticsKey: copy.analyticsKey,
        sourceScreen: options.returnTo ?? "guest_gate",
      });

      if (result.action === "primary") {
        router.push({
          pathname: "/(auth)/signup",
          params: {
            redirectTo: options.returnTo ?? "/(tabs)",
            reason: options.reason ?? options.feature,
          },
        });
      }

      return false;
    },
    [alert, isGuest, router],
  );

  return { promptIfGuestRestricted, isGuest };
}

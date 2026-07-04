import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useAccountRequiredPrompt } from "@/features/auth/hooks/useAccountRequiredPrompt";
import type { GuestFeature } from "@/features/auth/types/authMode";

type GuestRouteGuardOptions = {
  feature: GuestFeature;
  returnTo: string;
  reason?: string;
};

export function useGuestRouteGuard(options: GuestRouteGuardOptions) {
  const router = useRouter();
  const { isGuest, promptIfGuestRestricted } = useAccountRequiredPrompt();

  useEffect(() => {
    if (!isGuest) {
      return;
    }

    void promptIfGuestRestricted({
      feature: options.feature,
      returnTo: options.returnTo,
      reason: options.reason,
    }).then((allowed) => {
      if (!allowed) {
        router.back();
      }
    });
  }, [
    isGuest,
    options.feature,
    options.reason,
    options.returnTo,
    promptIfGuestRestricted,
    router,
  ]);

  return { isGuest };
}

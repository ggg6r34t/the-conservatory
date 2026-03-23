import { useEffect, useMemo, useState } from "react";

import {
  completeOnboarding,
  getOnboardingStatus,
  syncOnboardingStatusToAccount,
  type OnboardingStatus,
} from "@/features/onboarding/services/onboardingStorage";
import { markOnboardingCompletedAt } from "@/features/onboarding/services/onboardingDebugStorage";
import { trackEvent } from "@/services/analytics/analyticsService";

export function useOnboarding(userId?: string) {
  const [status, setStatus] = useState<OnboardingStatus>("pending");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    getOnboardingStatus(userId)
      .then((resolvedStatus) => {
        if (active) {
          setStatus(resolvedStatus);
        }
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    syncOnboardingStatusToAccount(userId)
      .then((resolvedStatus) => {
        setStatus(resolvedStatus);
      })
      .catch(() => undefined);
  }, [userId]);

  return useMemo(
    () => ({
      isReady,
      status,
      isCompleted: status === "completed",
      complete: async () => {
        await completeOnboarding({
          userId,
          scope: userId ? "both" : "device",
        });
        await markOnboardingCompletedAt();
        setStatus("completed");
        trackEvent("onboarding_completed", {
          source: "welcome_gateway",
        });
      },
    }),
    [isReady, status, userId],
  );
}

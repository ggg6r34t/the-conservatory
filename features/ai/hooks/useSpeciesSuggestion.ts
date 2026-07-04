import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveGuestCloudAllowed } from "@/features/auth/services/guestFeatureAccess";
import { useUsageLimits } from "@/features/billing/hooks/useUsageLimits";
import { canUseFeature } from "@/features/billing/services/entitlementService";
import { getSpeciesSuggestion } from "@/features/ai/services/plantIntelligenceService";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";

export function useSpeciesSuggestion(input: { imageUri?: string; isPremium: boolean }) {
  const { user, isGuest } = useAuth();
  const { data: usage } = useUsageLimits();

  const accessResult = usage
    ? canUseFeature("ai_species_identification", input.isPremium, usage)
    : null;

  const cloudAllowed = resolveGuestCloudAllowed(
    isGuest,
    input.isPremium || accessResult?.canUse === true,
  );
  const quotaExhausted =
    !input.isPremium &&
    accessResult?.canUse === false &&
    accessResult.reason === 'quota_exceeded';

  useEffect(() => {
    if (quotaExhausted) {
      trackMonetizationEvent("quota_reached", {
        feature: "ai_species_identification",
      });
    }
  }, [quotaExhausted]);

  const query = useQuery({
    queryKey: ["ai", "species-suggestion", input.imageUri ?? "none", cloudAllowed],
    enabled: Boolean(input.imageUri),
    staleTime: 1000 * 60 * 30,
    queryFn: () =>
      getSpeciesSuggestion({ imageUri: input.imageUri!, cloudAllowed, userId: user?.id }),
  });

  return { ...query, quotaExhausted };
}

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUsageLimits } from "@/features/billing/hooks/useUsageLimits";
import { canUseFeature } from "@/features/billing/services/entitlementService";
import { getSpeciesSuggestion } from "@/features/ai/services/plantIntelligenceService";

export function useSpeciesSuggestion(input: { imageUri?: string; isPremium: boolean }) {
  const { user } = useAuth();
  const { data: usage } = useUsageLimits();

  const accessResult = usage
    ? canUseFeature("ai_species_identification", input.isPremium, usage)
    : null;

  const cloudAllowed = input.isPremium || (accessResult?.canUse === true);

  return useQuery({
    queryKey: ["ai", "species-suggestion", input.imageUri ?? "none", cloudAllowed],
    enabled: Boolean(input.imageUri),
    staleTime: 1000 * 60 * 30,
    queryFn: () =>
      getSpeciesSuggestion({ imageUri: input.imageUri!, cloudAllowed, userId: user?.id }),
  });
}

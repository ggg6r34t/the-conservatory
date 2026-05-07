import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUsageLimits } from "@/features/billing/hooks/useUsageLimits";
import { canUseFeature } from "@/features/billing/services/entitlementService";
import {
  buildHealthInsightRevision,
  getHealthInsight,
} from "@/features/ai/services/healthInsightService";
import type { PlantWithRelations } from "@/types/models";

export function useHealthInsight(input: {
  plantId?: string;
  data?: PlantWithRelations | null;
  isPremium: boolean;
}) {
  const { user } = useAuth();
  const { data: usage } = useUsageLimits();

  const accessResult =
    usage && input.plantId
      ? canUseFeature("ai_health_insight", input.isPremium, usage, input.plantId)
      : null;

  const cloudAllowed = input.isPremium || (accessResult?.canUse === true);

  const revision = input.data ? buildHealthInsightRevision(input.data) : "none";

  return useQuery({
    queryKey: ["ai", "health-insight", input.plantId ?? "none", revision, cloudAllowed],
    enabled: Boolean(input.plantId && input.data),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getHealthInsight({
        plantId: input.plantId!,
        data: input.data!,
        cloudAllowed,
        userId: user?.id,
      }),
  });
}

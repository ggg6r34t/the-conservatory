import { useEffect } from "react";

import { AiInsightEmptyState } from "@/features/ai/components/AiInsightEmptyState";
import { HealthInsightCard } from "@/features/ai/components/HealthInsightCard";
import { useHealthInsight } from "@/features/ai/hooks/useHealthInsight";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useNetworkState } from "@/hooks/useNetworkState";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import type { PlantWithRelations } from "@/types/models";

export function PlantDetailHealthInsight({
  plantId,
  data,
}: {
  plantId: string;
  data: PlantWithRelations;
}) {
  const { isPremium } = useSubscription();
  const network = useNetworkState();
  const insightQuery = useHealthInsight({
    plantId,
    data,
    isPremium,
  });
  const { data: insight, quotaExhausted, isError, isLoading, refetch } =
    insightQuery;

  useEffect(() => {
    if (quotaExhausted) {
      trackMonetizationEvent("upgrade_prompt_viewed", {
        feature: "ai_health_insight",
      });
    }
  }, [quotaExhausted]);

  if (isLoading) {
    return null;
  }

  if (quotaExhausted) {
    return (
      <AiInsightEmptyState
        context="ai.quotaReached"
        screen="plant_detail"
        reason="quota_reached"
      />
    );
  }

  if (isError) {
    return (
      <AiInsightEmptyState
        context="ai.error"
        screen="plant_detail"
        reason="query_error"
        onRetry={() => void refetch()}
      />
    );
  }

  if (!insight) {
    return (
      <AiInsightEmptyState
        context="ai.insufficientData"
        screen="plant_detail"
        reason="insufficient_signals"
      />
    );
  }

  if (network.isOffline && insight.source === "local") {
    return (
      <>
        <AiInsightEmptyState
          context="ai.fallback"
          screen="plant_detail"
          reason="offline_local_fallback"
        />
        <HealthInsightCard insight={insight} />
      </>
    );
  }

  return <HealthInsightCard insight={insight} />;
}

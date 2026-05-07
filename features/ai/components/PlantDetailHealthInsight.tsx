import { useEffect } from "react";

import { HealthInsightCard } from "@/features/ai/components/HealthInsightCard";
import { useHealthInsight } from "@/features/ai/hooks/useHealthInsight";
import { UpgradePrompt } from "@/features/billing/components/UpgradePrompt";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
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
  const { data: insight, quotaExhausted } = useHealthInsight({
    plantId,
    data,
    isPremium,
  });

  useEffect(() => {
    if (quotaExhausted) {
      trackMonetizationEvent('upgrade_prompt_viewed', { feature: 'ai_health_insight' });
    }
  }, [quotaExhausted]);

  if (quotaExhausted) {
    return (
      <UpgradePrompt
        message="You've used your free AI health insights this month. Upgrade to Premium for unlimited analysis."
        cta="Unlock Unlimited Insights"
        compact
      />
    );
  }

  if (!insight) {
    return null;
  }

  return <HealthInsightCard insight={insight} />;
}

import { HealthInsightCard } from "@/features/ai/components/HealthInsightCard";
import { useHealthInsight } from "@/features/ai/hooks/useHealthInsight";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import type { PlantWithRelations } from "@/types/models";

export function PlantDetailHealthInsight({
  plantId,
  data,
}: {
  plantId: string;
  data: PlantWithRelations;
}) {
  const { isPremium } = useSubscription();
  const healthInsightQuery = useHealthInsight({
    plantId,
    data,
    isPremium,
  });

  if (!healthInsightQuery.data) {
    return null;
  }

  return <HealthInsightCard insight={healthInsightQuery.data} />;
}

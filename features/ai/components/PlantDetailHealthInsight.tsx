import { HealthInsightCard } from "@/features/ai/components/HealthInsightCard";
import { useHealthInsight } from "@/features/ai/hooks/useHealthInsight";
import type { PlantWithRelations } from "@/types/models";

export function PlantDetailHealthInsight({
  plantId,
  data,
}: {
  plantId: string;
  data: PlantWithRelations;
}) {
  const healthInsightQuery = useHealthInsight({
    plantId,
    data,
  });

  if (!healthInsightQuery.data) {
    return null;
  }

  return <HealthInsightCard insight={healthInsightQuery.data} />;
}

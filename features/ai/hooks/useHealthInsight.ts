import { useQuery } from "@tanstack/react-query";

import {
  buildHealthInsightRevision,
  getHealthInsight,
} from "@/features/ai/services/healthInsightService";
import type { PlantWithRelations } from "@/types/models";

export function useHealthInsight(input: {
  plantId?: string;
  data?: PlantWithRelations | null;
}) {
  const revision = input.data ? buildHealthInsightRevision(input.data) : "none";

  return useQuery({
    queryKey: ["ai", "health-insight", input.plantId ?? "none", revision],
    enabled: Boolean(input.plantId && input.data),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getHealthInsight({
        plantId: input.plantId!,
        data: input.data!,
      }),
  });
}

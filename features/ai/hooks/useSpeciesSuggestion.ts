import { useQuery } from "@tanstack/react-query";

import { getSpeciesSuggestion } from "@/features/ai/services/plantIntelligenceService";

export function useSpeciesSuggestion(imageUri?: string) {
  return useQuery({
    queryKey: ["ai", "species-suggestion", imageUri ?? "none"],
    enabled: Boolean(imageUri),
    staleTime: 1000 * 60 * 30,
    queryFn: () => getSpeciesSuggestion(imageUri!),
  });
}

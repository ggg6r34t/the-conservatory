import { useQuery } from "@tanstack/react-query";

import { getSpeciesSuggestion } from "@/features/ai/services/plantIntelligenceService";

export function useSpeciesSuggestion(input: { imageUri?: string; isPremium: boolean }) {
  return useQuery({
    queryKey: ["ai", "species-suggestion", input.imageUri ?? "none", input.isPremium],
    enabled: Boolean(input.imageUri),
    staleTime: 1000 * 60 * 30,
    queryFn: () => getSpeciesSuggestion({ imageUri: input.imageUri!, cloudAllowed: input.isPremium }),
  });
}

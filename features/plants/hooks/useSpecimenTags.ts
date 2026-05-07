import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { ensureSpecimenTag } from "@/features/plants/services/specimenTagsService";

export function useSpecimenTags() {
  const { user } = useAuth();
  const plantsQuery = useAllActivePlants();
  const plants = plantsQuery.data ?? [];

  const tagsQuery = useQuery({
    queryKey: [
      "specimen-tags",
      user?.id ?? "guest",
      plants.map((plant) => plant.id).join("|"),
    ],
    enabled: Boolean(user?.id) && plants.length > 0,
    queryFn: async () => {
      return Promise.all(
        plants.map((plant) => ensureSpecimenTag({ userId: user!.id, plant })),
      );
    },
  });

  return {
    plants,
    isLoading: plantsQuery.isLoading || tagsQuery.isLoading,
    error: plantsQuery.error ?? tagsQuery.error,
    tags: tagsQuery.data ?? [],
  };
}

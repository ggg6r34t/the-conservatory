import { useQueries, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { getArchiveCuration } from "@/features/ai/services/archiveCurationService";
import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";
import { getPlantById } from "@/features/plants/api/plantsClient";

export function useArchiveCuration(input: {
  userId?: string;
  memorials: GraveyardPlantListItem[];
}) {
  const plantQueries = useQueries({
    queries: input.memorials.map((memorial) => ({
      queryKey: queryKeys.plant(memorial.plantId),
      enabled: Boolean(input.userId && memorial.plantId),
      queryFn: () => getPlantById(input.userId!, memorial.plantId),
    })),
  });

  const items = input.memorials.map((memorial, index) => {
    const plant = plantQueries[index]?.data;
    return {
      plantId: memorial.plantId,
      plantName: memorial.name,
      photoUris:
        plant?.photos
          .map((photo) => photo.localUri ?? photo.remoteUrl ?? "")
          .filter(Boolean) ?? [],
    };
  });

  const revision = items
    .map((item) => `${item.plantId}:${item.photoUris.length}:${item.photoUris[0] ?? "none"}`)
    .join("|");

  const curationQuery = useQuery({
    queryKey: ["ai", "archive-curation", input.userId ?? "guest", revision],
    enabled: Boolean(input.userId && revision),
    staleTime: 1000 * 60 * 30,
    queryFn: () => getArchiveCuration(items.filter((item) => item.photoUris.length >= 2)),
  });

  return {
    data: curationQuery.data ?? [],
    isLoading:
      curationQuery.isLoading || plantQueries.some((query) => query.isLoading),
  };
}

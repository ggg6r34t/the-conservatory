import { useQueries, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { sortPhotosChronologically } from "@/features/ai/services/archivePhotoOrdering";
import { getArchiveCuration } from "@/features/ai/services/archiveCurationService";
import { listArchiveCurationOverrides } from "@/features/ai/services/archiveCurationOverridesService";
import type { ArchiveCuratedPair } from "@/features/ai/types/ai";
import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";
import { cloudAllowedForFeature } from "@/features/billing/services/featureAccess";
import { getPlantById } from "@/features/plants/api/plantsClient";
import { resolvePhotoDisplayUri } from "@/features/plants/services/plantPhotoResolver";

export function useArchiveCuration(input: {
  userId?: string;
  memorials: GraveyardPlantListItem[];
  isPremium: boolean;
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
    const sortedPhotos = sortPhotosChronologically(
      plant?.photos.map((photo) => ({
        id: photo.id,
        uri: resolvePhotoDisplayUri(photo, { context: "detail" }) ?? "",
        capturedAt: photo.capturedAt,
        takenAt: photo.takenAt,
        createdAt: photo.createdAt,
      })) ?? [],
    ).filter((photo) => photo.uri);

    return {
      plantId: memorial.plantId,
      plantName: memorial.name,
      photoUris: sortedPhotos.map((photo) => photo.uri),
      photos: sortedPhotos,
    };
  });

  const revision = items
    .map(
      (item) =>
        `${item.plantId}:${item.photoUris.length}:${item.photoUris[0] ?? "none"}`,
    )
    .join("|");

  const cloudAllowed = cloudAllowedForFeature(
    "ai_archive_curation",
    input.isPremium,
  );

  const curationQuery = useQuery({
    queryKey: [
      "ai",
      "archive-curation",
      input.userId ?? "guest",
      revision,
      cloudAllowed,
    ],
    enabled: Boolean(input.userId && revision),
    staleTime: 1000 * 60 * 30,
    queryFn: () =>
      getArchiveCuration(
        items.filter((item) => item.photoUris.length >= 2),
        cloudAllowed,
      ),
  });
  const overridesQuery = useQuery({
    queryKey: ["ai", "archive-curation-overrides", input.userId ?? "guest"],
    enabled: Boolean(input.userId),
    queryFn: () => listArchiveCurationOverrides(input.userId!),
  });

  const data = (curationQuery.data ?? []).map((pair): ArchiveCuratedPair => {
    const override = (overridesQuery.data ?? []).find(
      (candidate) => candidate.plantId === pair.plantId,
    );
    if (!override) {
      const item = items.find((candidate) => candidate.plantId === pair.plantId);
      return {
        ...pair,
        candidatePhotos: item?.photos ?? [],
      };
    }
    const item = items.find((candidate) => candidate.plantId === pair.plantId);
    const before = item?.photos.find(
      (photo) => photo.id === override.beforePhotoId,
    );
    const after = item?.photos.find(
      (photo) => photo.id === override.afterPhotoId,
    );
    if (!item || !before || !after) {
      return pair;
    }
    return {
      ...pair,
      beforeUri: before.uri,
      afterUri: after.uri,
      beforePhotoId: before.id,
      afterPhotoId: after.id,
      candidatePhotos: item.photos,
      caption: override.caption ?? pair.caption,
      source: "local",
    };
  });

  return {
    data,
    isLoading:
      curationQuery.isLoading ||
      overridesQuery.isLoading ||
      plantQueries.some((query) => query.isLoading),
  };
}

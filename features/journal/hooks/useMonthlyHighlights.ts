import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listCareLogsForPlantsSince } from "@/features/care-logs/api/careLogsClient";
import {
  listPhotosForPlants,
  listPlants,
} from "@/features/plants/api/plantsClient";
import { buildMonthlyHighlights } from "@/features/journal/services/monthlyHighlightsService";
import { getMonthlyHighlightsSinceIso } from "@/features/journal/services/monthlyHighlightsWindow";

export function useMonthlyHighlights() {
  const { user } = useAuth();
  const sinceIso = useMemo(() => getMonthlyHighlightsSinceIso(), []);

  const plantsQuery = useQuery({
    queryKey: [...queryKeys.plants, "monthly-highlights", "all"],
    enabled: Boolean(user?.id),
    queryFn: () =>
      listPlants({
        userId: user!.id,
        filter: "all",
        sort: "recent",
        query: "",
      }),
  });

  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);
  const plantIds = useMemo(() => plants.map((plant) => plant.id), [plants]);

  const photosQuery = useQuery({
    queryKey: ["photos", "monthly-highlights", user?.id ?? "anonymous", plantIds.join("|")],
    enabled: Boolean(user?.id) && plantIds.length > 0,
    queryFn: () =>
      listPhotosForPlants({
        userId: user!.id,
        plantIds,
        sinceCapturedAt: sinceIso,
      }),
  });

  const logsQuery = useQuery({
    queryKey: ["care-logs", "monthly-highlights", user?.id ?? "anonymous", plantIds.join("|"), sinceIso],
    enabled: Boolean(user?.id) && plantIds.length > 0,
    queryFn: () => listCareLogsForPlantsSince(plantIds, sinceIso),
  });

  const photos = useMemo(() => photosQuery.data ?? [], [photosQuery.data]);
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const monthlyHighlights = useMemo(
    () =>
      buildMonthlyHighlights({
        plants,
        photos,
        logs,
      }),
    [logs, photos, plants],
  );

  return {
    plantsQuery,
    photosQuery,
    logsQuery,
    ...monthlyHighlights,
    isLoading:
      plantsQuery.isLoading || photosQuery.isLoading || logsQuery.isLoading,
    isError: plantsQuery.isError || photosQuery.isError || logsQuery.isError,
  };
}

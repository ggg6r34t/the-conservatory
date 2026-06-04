import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";

export function invalidatePlantPhotoQueries(
  queryClient: QueryClient,
  plantId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plants });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.graveyard });
  void queryClient.invalidateQueries({ queryKey: ["photos"] });

  if (plantId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });
  }
}

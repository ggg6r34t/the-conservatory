import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { listPlants } from "@/features/plants/api/plantsClient";
import { resolvePlantLibraryFilter } from "@/features/plants/services/plantLibraryFilterService";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";

export function usePlants() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const filter = usePlantStore((state) => state.filter);
  const sort = usePlantStore((state) => state.sort);
  const query = usePlantStore((state) => state.query);
  const effectiveFilter = resolvePlantLibraryFilter(filter, isPremium);

  return useQuery({
    queryKey: [...queryKeys.plants, effectiveFilter, sort, query, isPremium],
    enabled: Boolean(user?.id),
    queryFn: () =>
      listPlants({
        userId: user!.id,
        filter: effectiveFilter,
        sort,
        query,
        isPremium,
      }),
  });
}

export function useAllActivePlants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.plants, "active", "all"],
    enabled: Boolean(user?.id),
    queryFn: () =>
      listPlants({
        userId: user!.id,
        filter: "all",
        sort: "recent",
        query: "",
      }),
  });
}

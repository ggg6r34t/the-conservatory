import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listPlants } from "@/features/plants/api/plantsClient";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";

export function usePlants() {
  const { user } = useAuth();
  const filter = usePlantStore((state) => state.filter);
  const sort = usePlantStore((state) => state.sort);
  const query = usePlantStore((state) => state.query);

  return useQuery({
    queryKey: [...queryKeys.plants, filter, sort, query],
    enabled: Boolean(user?.id),
    queryFn: () =>
      listPlants({
        userId: user!.id,
        filter,
        sort,
        query,
      }),
  });
}

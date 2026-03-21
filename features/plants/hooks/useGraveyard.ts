import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listGraveyardPlants } from "@/features/plants/api/plantsClient";

export function useGraveyard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.graveyard,
    enabled: Boolean(user?.id),
    queryFn: () => listGraveyardPlants(user!.id),
  });
}

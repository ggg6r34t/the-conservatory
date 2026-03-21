import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getPlantById } from "@/features/plants/api/plantsClient";

export function usePlant(plantId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.plant(plantId),
    enabled: Boolean(user?.id && plantId),
    queryFn: () => getPlantById(user!.id, plantId),
  });
}

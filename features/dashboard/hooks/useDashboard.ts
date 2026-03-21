import { useMemo } from "react";

import { usePlants } from "@/features/plants/hooks/usePlants";
import { useNetworkState } from "@/hooks/useNetworkState";

export function useDashboard() {
  const plantsQuery = usePlants();
  const network = useNetworkState();

  return useMemo(() => {
    const plants = plantsQuery.data ?? [];
    const dueToday = plants.filter((plant) => {
      if (!plant.nextWaterDueAt) {
        return false;
      }

      return (
        new Date(plant.nextWaterDueAt).getTime() <=
        Date.now() + 1000 * 60 * 60 * 24
      );
    });

    return {
      plants,
      dueToday,
      isOffline: network.isOffline,
      isLoading: plantsQuery.isLoading,
    };
  }, [network.isOffline, plantsQuery.data, plantsQuery.isLoading]);
}

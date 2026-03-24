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

    const now = Date.now();
    const nextFutureDueAtMs = plants
      .map((plant) =>
        plant.nextWaterDueAt ? new Date(plant.nextWaterDueAt).getTime() : null,
      )
      .filter((value): value is number => value != null && value > now)
      .sort((left, right) => left - right)[0];

    const nextCycleHours =
      nextFutureDueAtMs == null
        ? null
        : Math.max(1, Math.ceil((nextFutureDueAtMs - now) / (1000 * 60 * 60)));

    return {
      plants,
      dueToday,
      nextCycleHours,
      isOffline: network.isOffline,
      isLoading: plantsQuery.isLoading,
    };
  }, [network.isOffline, plantsQuery.data, plantsQuery.isLoading]);
}

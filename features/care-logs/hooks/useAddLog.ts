import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCareLog } from "@/features/care-logs/api/careLogsClient";

export function useAddLog(plantId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      logType: "water" | "mist" | "feed" | "prune" | "pest" | "note";
      notes?: string;
    }) =>
      createCareLog({
        userId: user!.id,
        plantId,
        ...input,
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.careLogs(plantId) })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plant(plantId) })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.plants })
        .catch(() => undefined);
      queryClient
        .invalidateQueries({ queryKey: queryKeys.dashboard })
        .catch(() => undefined);
    },
  });
}

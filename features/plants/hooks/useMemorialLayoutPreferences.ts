import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  readMemorialLayoutPreferences,
  setFeaturedMemorialPreference,
} from "@/features/plants/services/memorialLayoutPreferencesService";

export function useMemorialLayoutPreferences(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["memorial-layout-preferences", userId],
    enabled: Boolean(userId),
    queryFn: () => readMemorialLayoutPreferences(userId!),
  });

  const setFeatured = useMutation({
    mutationFn: (memorialId: string | null) =>
      setFeaturedMemorialPreference(userId!, memorialId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["memorial-layout-preferences", userId],
      });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    setFeaturedMemorial: setFeatured,
  };
}

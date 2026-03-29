import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateUserPreferences } from "@/features/settings/api/settingsClient";

export function useUpdateSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: {
      remindersEnabled?: boolean;
      autoSyncEnabled?: boolean;
      defaultWateringHour?: number;
      timezone?: string;
    }) => updateUserPreferences(user!.id, patch),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.preferences })
        .catch(() => undefined);
    },
  });
}

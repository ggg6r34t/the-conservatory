import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNetworkState } from "@/hooks/useNetworkState";
import { invalidateBackupQueries } from "@/features/profile/utils/invalidateBackupQueries";
import { updateUserPreferences } from "@/features/settings/api/settingsClient";
import { runUserDataSync } from "@/services/database/userDataSync";
import { logger } from "@/utils/logger";

export function useUpdateSettings() {
  const { user } = useAuth();
  const { isOffline } = useNetworkState();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: {
      remindersEnabled?: boolean;
      autoSyncEnabled?: boolean;
      defaultWateringHour?: number;
      timezone?: string;
    }) => updateUserPreferences(user!.id, patch),
    onSuccess: (_, variables) => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.preferences })
        .catch(() => undefined);

      if (variables.autoSyncEnabled === true && !isOffline && user?.id) {
        const userId = user.id;
        void (async () => {
          try {
            await runUserDataSync({ userId, trigger: "auto-settings" });
            await invalidateBackupQueries(queryClient, userId).catch(
              () => undefined,
            );
          } catch (error) {
            logger.warn("sync.auto_settings.failed", {
              userId,
              message:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
      }
    },
  });
}

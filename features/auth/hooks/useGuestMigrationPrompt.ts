import { useCallback } from "react";

import {
  captureGuestMigrationSource,
  deferGuestMigration,
  deleteGuestLocalData,
  migrateGuestDataToUser,
} from "@/features/auth/api/authClient";
import {
  clearPendingGuestMigrationId,
  hasGuestLocalData,
} from "@/features/auth/services/guestSessionService";
import { useAlert } from "@/hooks/useAlert";
import { trackEvent } from "@/services/analytics/analyticsService";
import { logger } from "@/utils/logger";

export function useGuestMigrationPrompt() {
  const alert = useAlert();

  const promptGuestMigration = useCallback(
    async (authenticatedUserId: string) => {
      const guestUserId = await captureGuestMigrationSource();
      if (!guestUserId) {
        return;
      }

      if (!(await hasGuestLocalData(guestUserId))) {
        await clearPendingGuestMigrationId();
        return;
      }

      const choice = await alert.show({
        variant: "info",
        title: "Move your local conservatory into this account?",
        message:
          "You have plants saved on this device. Move them into your account, start fresh, or decide later.",
        primaryAction: { label: "Move data", tone: "primary" },
        secondaryAction: { label: "More options" },
        analyticsKey: "guest_migration_prompt",
        sourceScreen: "post_auth",
      });

      if (choice.action === "primary") {
        trackEvent("guest_data_migration_started");
        try {
          await migrateGuestDataToUser({
            guestUserId,
            authenticatedUserId,
          });
          trackEvent("guest_data_migration_completed");
        } catch (error) {
          trackEvent("guest_data_migration_failed");
          logger.warn("guest.migration.failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          await alert.show({
            variant: "error",
            title: "Couldn't move your data",
            message:
              "Your local conservatory is still on this device. Try again from Profile when you're ready.",
            primaryAction: { label: "Close", tone: "danger" },
            analyticsKey: "guest_migration_failed",
            sourceScreen: "post_auth",
          });
        }
        return;
      }

      if (choice.action === "secondary" || choice.action === "dismiss") {
        const followUp = await alert.show({
          variant: "info",
          title: "What would you like to do?",
          message:
            "Your local conservatory stays on this device until you choose.",
          primaryAction: { label: "Decide later", tone: "primary" },
          secondaryAction: { label: "Start fresh" },
          analyticsKey: "guest_migration_follow_up",
          sourceScreen: "post_auth",
        });

        if (followUp.action === "primary") {
          await deferGuestMigration(guestUserId);
          return;
        }

        if (followUp.action === "secondary") {
          const confirmed = await alert.confirm({
            variant: "destructive",
            title: "Start fresh?",
            message:
              "This removes local-only plants, photos, and care logs from this device before continuing with your account.",
            confirmLabel: "Start fresh",
            cancelLabel: "Keep local data for now",
            analyticsKey: "guest_migration_start_fresh",
            sourceScreen: "post_auth",
          });

          if (confirmed) {
            await deleteGuestLocalData(guestUserId);
          } else {
            await deferGuestMigration(guestUserId);
          }
          return;
        }

        await deferGuestMigration(guestUserId);
      }
    },
    [alert],
  );

  return { promptGuestMigration };
}

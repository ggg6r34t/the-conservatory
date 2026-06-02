import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

import { useUserDataSyncState } from "@/features/profile/hooks/useUserDataSyncState";
import { useSnackbar } from "@/hooks/useSnackbar";

const AUTO_TRIGGERS = new Set([
  "auto-bootstrap",
  "auto-foreground",
  "auto-network",
  "auto-queue",
  "auto-settings",
]);

export function SyncAutoFailureNotifier() {
  const syncState = useUserDataSyncState();
  const snackbar = useSnackbar();
  const router = useRouter();
  const lastNotifiedErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      syncState.isRunning ||
      !syncState.lastError ||
      !syncState.lastFailedTrigger ||
      !AUTO_TRIGGERS.has(syncState.lastFailedTrigger)
    ) {
      return;
    }

    if (lastNotifiedErrorRef.current === syncState.lastError) {
      return;
    }

    lastNotifiedErrorRef.current = syncState.lastError;
    snackbar.error("Auto sync could not finish. Open Backup Repair to review.", {
      action: {
        label: "Repair",
        onPress: () => router.push("/sync-repair"),
      },
    });
  }, [
    router,
    snackbar,
    syncState.lastFailedTrigger,
    syncState.isRunning,
    syncState.lastError,
  ]);

  return null;
}

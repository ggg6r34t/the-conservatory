import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getBackupSummary,
  getRemoteBackupAvailability,
  runBackupSync,
} from "@/features/profile/api/profileClient";
import { useUserDataSyncState } from "@/features/profile/hooks/useUserDataSyncState";
import { deriveCloudSyncStatus } from "@/features/profile/services/cloudSyncStatusService";
import { deriveSyncHealth } from "@/features/profile/services/syncHealthService";
import { invalidateBackupQueries } from "@/features/profile/utils/invalidateBackupQueries";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useNetworkState } from "@/hooks/useNetworkState";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

export function useBackupStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const backendConfiguration = getBackendConfigurationSummary();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const syncRuntime = useUserDataSyncState();
  const { isPremium } = useSubscription();

  const summaryQuery = useQuery({
    queryKey: ["profile-backup-summary", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getBackupSummary(user!.id),
  });

  const remoteAvailabilityQuery = useQuery({
    queryKey: ["profile-backup-availability", user?.id, network.isOffline],
    enabled: Boolean(user?.id) && !network.isOffline,
    queryFn: () => getRemoteBackupAvailability(),
    staleTime: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => runBackupSync(user!.id),
    onSuccess: async () => {
      await invalidateBackupQueries(queryClient, user?.id).catch(
        () => undefined,
      );
    },
  });

  const summary = summaryQuery.data;
  const remoteAvailability = useMemo(() => {
    if (network.isOffline) {
      return {
        state: "offline",
        title: "Offline mode",
        description:
          "Online backup can't be reached until you're connected again, but your conservatory is still available on this device.",
        canSync: false,
      };
    }

    return (
      remoteAvailabilityQuery.data ?? {
        state: backendConfiguration.mode,
        title:
          backendConfiguration.mode === "cloud"
            ? "Checking cloud sync"
            : backendConfiguration.mode === "local-development"
              ? "Local-only mode"
              : "Cloud sync unavailable",
        description:
          backendConfiguration.mode === "cloud"
            ? "Checking whether cloud sync is reachable for this build."
            : backendConfiguration.mode === "local-development"
              ? "This build is currently storing your conservatory on this device only."
              : "Cloud sync isn't configured for this build yet.",
        canSync: false,
      }
    );
  }, [backendConfiguration.mode, network.isOffline, remoteAvailabilityQuery.data]);

  const syncHealth = useMemo(() => deriveSyncHealth(summary), [summary]);
  const hasIssues = syncHealth.hasIssues;
  const hasPending = syncHealth.hasPending;
  const autoSyncEnabled = settingsQuery.data?.autoSyncEnabled ?? true;
  const isSyncRunning = syncRuntime.isRunning || syncMutation.isPending;
  const cloudSyncStatus = useMemo(
    () =>
      deriveCloudSyncStatus({
        autoSyncEnabled,
        remoteAvailability,
        isOffline: network.isOffline,
        isSyncRunning,
        hasIssues,
        hasPending,
        lastSuccessfulSyncAt: summary?.lastSuccessfulSyncAt ?? null,
        isPremium,
      }),
    [
      autoSyncEnabled,
      hasIssues,
      hasPending,
      isPremium,
      isSyncRunning,
      network.isOffline,
      remoteAvailability,
      summary?.lastSuccessfulSyncAt,
    ],
  );

  const autoSyncMutation = useMutation({
    mutationFn: (nextValue: boolean) =>
      updateSettings.mutateAsync({ autoSyncEnabled: nextValue }),
    onSuccess: async () => {
      await invalidateBackupQueries(queryClient, user?.id).catch(
        () => undefined,
      );
    },
  });

  return {
    user,
    summary,
    summaryQuery,
    remoteAvailability,
    remoteAvailabilityQuery,
    syncMutation,
    autoSyncMutation,
    autoSyncEnabled,
    isAutoSyncPending: autoSyncMutation.isPending || settingsQuery.isLoading,
    isSyncRunning,
    lastSuccessfulSyncAt: summary?.lastSuccessfulSyncAt ?? null,
    overviewState: cloudSyncStatus.statusTitle,
    overviewSecondaryValue: cloudSyncStatus.statusValue,
    overviewSupportingLabel: cloudSyncStatus.statusDetail,
    hasIssues,
    hasPending,
    syncHealth,
    canSync:
      Boolean(user?.id) && remoteAvailability.canSync && !isSyncRunning,
    canToggleAutoSync: Boolean(user?.id),
    cloudSyncTitle: "Auto-sync Conservatory",
    cloudSyncDescription: isPremium
      ? "Automatically back up plants, care history, reminders, and progress photos to cloud storage."
      : "Automatically back up plants, care history, and reminders. Progress photo backup resumes with Premium.",
    backendMode: backendConfiguration.mode,
  };
}

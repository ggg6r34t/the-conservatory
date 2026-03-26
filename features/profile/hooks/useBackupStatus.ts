import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getBackupSummary,
  getRemoteBackupAvailability,
  runBackupSync,
} from "@/features/profile/api/profileClient";
import { useNetworkState } from "@/hooks/useNetworkState";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

function formatLastSuccessfulSync(value: string | null) {
  if (!value) {
    return "Not yet synced";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sync recently observed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function useBackupStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const backendConfiguration = getBackendConfigurationSummary();

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
        queryClient.invalidateQueries({
          queryKey: ["profile-backup-summary", user?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profile-backup-availability", user?.id],
        }),
      ]);
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
            ? "Checking online backup"
            : backendConfiguration.mode === "local-development"
              ? "This device only"
              : "Online backup unavailable",
        description:
          backendConfiguration.mode === "cloud"
            ? "Checking whether your online backup is reachable."
            : backendConfiguration.mode === "local-development"
              ? "This build is currently storing your conservatory on this device only."
              : "Online backup isn't configured for this build yet.",
        canSync: false,
      }
    );
  }, [backendConfiguration.mode, network.isOffline, remoteAvailabilityQuery.data]);

  const hasIssues = Boolean(
    summary &&
      (summary.failedSyncUser > 0 ||
        summary.failedSyncQueueAccount > 0 ||
        summary.failedSyncQueueDevice > 0),
  );
  const hasPending = Boolean(
    summary &&
      (summary.pendingSyncUser > 0 ||
        summary.pendingSyncQueueAccount > 0 ||
        summary.pendingSyncQueueDevice > 0 ||
        summary.processingSync > 0),
  );

  const systemStatus = useMemo(() => {
    if (network.isOffline) {
      return {
        title: "Offline mode",
        description:
          "Your archive remains available on this device while cloud sync waits for a connection.",
      };
    }

    if (
      remoteAvailability.state === "local-only" ||
      remoteAvailability.state === "unavailable"
    ) {
      return {
        title: remoteAvailability.title,
        description: remoteAvailability.description,
      };
    }

    if (hasIssues) {
      return {
        title: "Needs attention",
        description:
          "Some recent backup activity still needs a closer look before everything feels settled.",
      };
    }

    if (hasPending || syncMutation.isPending) {
      return {
        title: "Sync in progress",
        description:
          "Recent changes are being gathered and prepared for your account backup.",
      };
    }

    if (summary?.lastSuccessfulSyncAt) {
      return {
        title: "All systems operational",
        description:
          "A recent successful sync has been observed locally for your conservatory.",
      };
    }

    return {
      title: "Ready to back up",
      description:
        "Your archive is ready whenever you'd like to refresh its online backup.",
      };
  }, [
    hasIssues,
    hasPending,
    network.isOffline,
    remoteAvailability.description,
    remoteAvailability.state,
    remoteAvailability.title,
    summary?.lastSuccessfulSyncAt,
    syncMutation.isPending,
  ]);

  return {
    user,
    summary,
    summaryQuery,
    remoteAvailability,
    remoteAvailabilityQuery,
    syncMutation,
    systemStatus,
    lastSuccessfulSyncAt: summary?.lastSuccessfulSyncAt ?? null,
    overviewState: systemStatus.title,
    overviewSecondaryValue:
      remoteAvailability.state === "available" &&
      !hasIssues &&
      !hasPending &&
      !syncMutation.isPending &&
      summary?.lastSuccessfulSyncAt
        ? formatLastSuccessfulSync(summary.lastSuccessfulSyncAt)
        : network.isOffline
          ? "Awaiting connection"
          : "Review details",
    overviewSupportingLabel:
      network.isOffline ||
      hasIssues ||
      hasPending ||
      syncMutation.isPending ||
      !summary?.lastSuccessfulSyncAt
        ? systemStatus.description
        : "Recent successful sync observed",
    hasIssues,
    hasPending,
    canSync: Boolean(user?.id) && remoteAvailability.canSync,
  };
}

import { StyleSheet, Text, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getBackupSummary,
  getRemoteBackupAvailability,
  runBackupSync,
} from "@/features/profile/api/profileClient";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useNetworkState } from "@/hooks/useNetworkState";
import { useSnackbar } from "@/hooks/useSnackbar";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

function BackupMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: colors.surfaceContainerLowest },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.primary }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

export default function DataBackupScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const backendConfiguration = getBackendConfigurationSummary();

  const backupSummary = useQuery({
    queryKey: ["profile-backup-summary", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getBackupSummary(user!.id),
  });

  const remoteAvailability = useQuery({
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
      ]);
      snackbar.success("Your local backup summary has been refreshed.");
    },
    onError: (error) => {
      void alert.show({
        variant: "error",
        title: "Sync failed",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't complete backup sync right now.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    },
  });

  const summary = backupSummary.data;
  const systemStatus = network.isOffline
    ? {
        title: "Offline mode",
        description:
          "Remote backup cannot be reached until connectivity returns, but your local conservatory remains available on this device.",
        canSync: false,
      }
    : (remoteAvailability.data ?? {
        title:
          backendConfiguration.mode === "cloud"
            ? "Checking remote backup"
            : backendConfiguration.mode === "local-development"
              ? "Local device only"
              : "Remote backup unavailable",
        description:
          backendConfiguration.mode === "cloud"
            ? "Checking whether online backup is currently reachable."
            : backendConfiguration.description,
        canSync: false,
      });

  return (
    <ProfileScreenScaffold
      title="Data Backup"
      subtitle="Sync & recovery"
      description="Review what is saved to your account, what is still waiting on this device, and refresh from online backup when needed."
    >
      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.statusLabel, { color: colors.secondary }]}>
          SYSTEM STATUS
        </Text>
        <Text style={[styles.statusValue, { color: colors.primary }]}>
          {systemStatus.title}
        </Text>
        <Text style={[styles.statusBody, { color: colors.onSurfaceVariant }]}>
          {systemStatus.description}
        </Text>
        {remoteAvailability.data?.detail ? (
          <Text
            style={[styles.statusDetail, { color: colors.onSurfaceVariant }]}
          >
            {remoteAvailability.data.detail}
          </Text>
        ) : null}
      </View>

      {summary ? (
        <View style={styles.metricGrid}>
          <BackupMetric label="Active plants" value={summary.activePlants} />
          <BackupMetric label="Memorials" value={summary.archivedPlants} />
          <BackupMetric label="Photos" value={summary.photos} />
          <BackupMetric label="Care logs" value={summary.careLogs} />
          <BackupMetric
            label="Waiting to upload (account)"
            value={summary.pendingSyncUser}
          />
          <BackupMetric
            label="Upload issues (account)"
            value={summary.failedSyncUser}
          />
          <BackupMetric
            label="Waiting on this device"
            value={summary.pendingSyncDevice}
          />
          <BackupMetric
            label="Issues on this device"
            value={summary.failedSyncDevice}
          />
        </View>
      ) : null}

      <PrimaryButton
        label={syncMutation.isPending ? "Running Sync..." : "Run Sync Now"}
        disabled={syncMutation.isPending || !user?.id || !systemStatus.canSync}
        loading={syncMutation.isPending}
        onPress={() => syncMutation.mutate()}
      />
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  statusLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  statusValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  statusBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  statusDetail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  metricValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  metricLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
});

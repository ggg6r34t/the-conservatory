import { Alert, StyleSheet, Text, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getBackupSummary,
  runBackupSync,
} from "@/features/profile/api/profileClient";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useNetworkState } from "@/hooks/useNetworkState";

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
      <Text style={[styles.metricValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

export default function DataBackupScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const network = useNetworkState();

  const backupSummary = useQuery({
    queryKey: ["profile-backup-summary", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getBackupSummary(user!.id),
  });

  const syncMutation = useMutation({
    mutationFn: () => runBackupSync(user!.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.graveyard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
        queryClient.invalidateQueries({ queryKey: ["profile-backup-summary", user?.id] }),
      ]);
      Alert.alert("Sync complete", "Your local backup summary has been refreshed.");
    },
    onError: (error) => {
      Alert.alert(
        "Sync failed",
        error instanceof Error
          ? error.message
          : "We couldn't complete backup sync right now.",
      );
    },
  });

  const summary = backupSummary.data;

  return (
    <ProfileScreenScaffold
      title="Data Backup"
      subtitle="Sync & recovery"
      description="Review how much of your conservatory is stored locally, how many sync operations are waiting, and manually pull the latest remote data when needed."
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
          {network.isOffline ? "Offline mode" : "Ready to sync"}
        </Text>
        <Text style={[styles.statusBody, { color: colors.onSurfaceVariant }]}>
          {network.isOffline
            ? "Remote pull is unavailable until connectivity returns, but local data remains accessible."
            : "You can run a manual sync to push pending changes and hydrate the latest remote records into local storage."}
        </Text>
      </View>

      {summary ? (
        <View style={styles.metricGrid}>
          <BackupMetric label="Active plants" value={summary.activePlants} />
          <BackupMetric label="Memorials" value={summary.archivedPlants} />
          <BackupMetric label="Photos" value={summary.photos} />
          <BackupMetric label="Care logs" value={summary.careLogs} />
          <BackupMetric label="Pending sync" value={summary.pendingSync} />
          <BackupMetric label="Failed sync" value={summary.failedSync} />
        </View>
      ) : null}

      <PrimaryButton
        label={syncMutation.isPending ? "Running Sync..." : "Run Sync Now"}
        disabled={syncMutation.isPending || network.isOffline || !user?.id}
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

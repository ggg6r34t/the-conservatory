import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useBackupStatus } from "@/features/profile/hooks/useBackupStatus";
import { useNetworkState } from "@/hooks/useNetworkState";
import {
  getBackupSyncFailureMessage,
  getBackupSyncSuccessMessage,
} from "@/features/profile/services/backupSyncMessaging";
import { getSyncQueueDiagnostics } from "@/features/profile/services/syncDiagnosticsService";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

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

export default function BackupDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { canSync, remoteAvailability, summary, syncMutation, hasIssues, hasPending } =
    useBackupStatus();
  const network = useNetworkState();
  const abandonedCount =
    (summary?.abandonedSyncQueueAccount ?? 0) +
    (summary?.abandonedSyncQueueDevice ?? 0);
  const queueDiagnosticsQuery = useQuery({
    queryKey: ["sync-queue-diagnostics"],
    queryFn: getSyncQueueDiagnostics,
  });
  const queueDiagnostics = queueDiagnosticsQuery.data;

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        snackbar.success(
          getBackupSyncSuccessMessage({
            remoteCanSync: remoteAvailability.canSync,
            hasIssues,
            hasPending,
            completedWithFollowups:
              result.outcome === "completed_with_followups",
          }),
        );
      },
      onError: (error) => {
        void alert.show({
          variant: "error",
          title: "Backup update failed",
          message: getBackupSyncFailureMessage(error),
          primaryAction: { label: "Close", tone: "danger" },
        });
      },
    });
  };

  return (
    <ProfileScreenScaffold
      title="Backup Details"
      subtitle="System status"
      description="Review what is saved to your account, what is still pending, and where recent sync activity may still need attention."
    >
      {network.isOffline ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "ai.offline" })}
          screen="backup_details"
          reason="offline"
        />
      ) : remoteAvailability.state === "local-development" ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "backup.localOnly" })}
          screen="backup_details"
          reason="local_only"
        />
      ) : !remoteAvailability.canSync &&
        remoteAvailability.state !== "cloud" ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "backup.unavailable" })}
          screen="backup_details"
          reason="sync_unavailable"
        />
      ) : null}

      {abandonedCount > 0 ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "sync.abandoned" })}
          screen="backup_details"
          reason="sync_abandoned"
          primaryHref="/sync-repair"
        />
      ) : null}

      {!summary?.lastSuccessfulSyncAt && remoteAvailability.canSync ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "backup.noHistory" })}
          screen="backup_details"
          reason="no_sync_history"
        />
      ) : null}

      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.statusValue, { color: colors.primary }]}>
          {remoteAvailability.title}
        </Text>
        <Text style={[styles.statusBody, { color: colors.onSurfaceVariant }]}>
          {remoteAvailability.description}
        </Text>
        {"detail" in remoteAvailability && remoteAvailability.detail ? (
          <Text
            style={[styles.statusDetail, { color: colors.onSurfaceVariant }]}
          >
            {remoteAvailability.detail}
          </Text>
        ) : null}
      </View>

      {summary && !summary.syncEnabled ? (
        <View
          style={[
            styles.syncDisabledNotice,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text
            style={[
              styles.syncDisabledText,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Cloud sync is disabled. Enable it in Settings to back up your data.
          </Text>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.metricsSection}>
          <Text
            style={[styles.metricsNote, { color: colors.onSurfaceVariant }]}
          >
            Some counts below reflect work this device is still preparing to
            send, so they may extend beyond your account&apos;s saved record
            totals.
          </Text>
          <View style={styles.metricGrid}>
            <BackupMetric label="Active plants" value={summary.activePlants} />
            <BackupMetric label="Memorials" value={summary.archivedPlants} />
            <BackupMetric label="Photos" value={summary.photos} />
            <BackupMetric label="Care logs" value={summary.careLogs} />
            <BackupMetric label="Reminders" value={summary.reminders} />
            <BackupMetric label="Care log tags" value={summary.careLogTags} />
            <BackupMetric
              label="Status snapshots"
              value={summary.plantStatusSnapshots}
            />
            <BackupMetric label="Specimen tags" value={summary.specimenTags} />
            <BackupMetric
              label="Archive overrides"
              value={summary.archiveCurationOverrides}
            />
            <BackupMetric
              label="Local usage records"
              value={summary.featureUsageRecords}
            />
            <BackupMetric
              label="Records waiting to save"
              value={summary.pendingSyncUser}
            />
            <BackupMetric
              label="Records needing attention"
              value={summary.failedSyncUser}
            />
            <BackupMetric
              label="Changes queued for backup"
              value={summary.pendingSyncQueueAccount}
            />
            <BackupMetric
              label="Queued changes needing attention"
              value={summary.failedSyncQueueAccount}
            />
            <BackupMetric
              label="This device still preparing"
              value={summary.pendingSyncQueueDevice}
            />
            <BackupMetric
              label="This device needs attention"
              value={summary.failedSyncQueueDevice}
            />
            <BackupMetric
              label="Unrecoverable queue items"
              value={
                summary.abandonedSyncQueueAccount +
                summary.abandonedSyncQueueDevice
              }
            />
            <BackupMetric
              label="Currently in progress"
              value={summary.processingSync}
            />
            <BackupMetric
              label="Recently completed"
              value={summary.completedSync}
            />
            {queueDiagnostics && queueDiagnostics.deletedBeforeSync > 0 ? (
              <BackupMetric
                label="Removed before upload"
                value={queueDiagnostics.deletedBeforeSync}
              />
            ) : null}
            {queueDiagnostics && queueDiagnostics.skipped > 0 ? (
              <BackupMetric
                label="Skipped by sync"
                value={queueDiagnostics.skipped}
              />
            ) : null}
            {queueDiagnostics && queueDiagnostics.deferred > 0 ? (
              <BackupMetric
                label="Deferred for retry"
                value={queueDiagnostics.deferred}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <PrimaryButton
        label={
          syncMutation.isPending ? "Updating Backup..." : "Update Backup Now"
        }
        disabled={syncMutation.isPending || !canSync}
        loading={syncMutation.isPending}
        onPress={handleSync}
      />
      <SecondaryButton
        label="Open Backup Repair"
        onPress={() => router.push("/sync-repair")}
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
  metricsSection: {
    gap: 12,
  },
  metricsNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
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
  syncDisabledNotice: {
    borderRadius: 16,
    padding: 16,
  },
  syncDisabledText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});

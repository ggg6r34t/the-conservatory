import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useBackupStatus } from "@/features/profile/hooks/useBackupStatus";
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
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { canSync, remoteAvailability, summary, syncMutation } = useBackupStatus();

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        snackbar.success("Your local backup summary has been refreshed.");
      },
      onError: (error) => {
        void alert.show({
          variant: "error",
          title: "Backup update failed",
          message:
            error instanceof Error
              ? error.message
              : "We couldn't update your backup right now.",
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

        {summary ? (
        <View style={styles.metricsSection}>
          <Text style={[styles.metricsNote, { color: colors.onSurfaceVariant }]}>
            Some counts below reflect work this device is still preparing to send,
            so they may extend beyond your account&apos;s saved record totals.
          </Text>
          <View style={styles.metricGrid}>
            <BackupMetric label="Active plants" value={summary.activePlants} />
            <BackupMetric label="Memorials" value={summary.archivedPlants} />
            <BackupMetric label="Photos" value={summary.photos} />
            <BackupMetric label="Care logs" value={summary.careLogs} />
            <BackupMetric label="Reminders" value={summary.reminders} />
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
              label="Currently in progress"
              value={summary.processingSync}
            />
            <BackupMetric
              label="Recently completed"
              value={summary.completedSync}
            />
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
});

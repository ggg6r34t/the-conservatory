import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAccountRequiredPrompt } from "@/features/auth/hooks/useAccountRequiredPrompt";
import { CloudSyncControlCard } from "@/features/profile/components/CloudSyncControlCard";
import { DataBackupExportCard } from "@/features/profile/components/DataBackupExportCard";
import { DataBackupHeroCard } from "@/features/profile/components/DataBackupHeroCard";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useBackupStatus } from "@/features/profile/hooks/useBackupStatus";
import {
  getBackupSyncFailureMessage,
  getBackupSyncSuccessMessage,
} from "@/features/profile/services/backupSyncMessaging";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { trackGtmEvent } from "@/services/analytics/analyticsService";

export default function DataBackupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { isGuest } = useAuth();
  const { promptIfGuestRestricted } = useAccountRequiredPrompt();
  const {
    overviewState,
    overviewSupportingLabel,
    overviewSecondaryValue,
    syncMutation,
    canSync,
    autoSyncEnabled,
    autoSyncMutation,
    canToggleAutoSync,
    cloudSyncTitle,
    cloudSyncDescription,
    isSyncRunning,
    remoteAvailability,
    hasIssues,
    hasPending,
  } = useBackupStatus();

  useEffect(() => {
    trackGtmEvent("backup_screen_viewed");
  }, []);

  if (isGuest) {
    return (
      <ProfileScreenScaffold
        title="Data & Backup"
        subtitle="Archive care"
        description="Your conservatory is stored only on this device until you create an account."
      >
        <View style={styles.content}>
          <View
            style={[
              styles.guestLocalCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Icon name="cloud-off-outline" size={28} color={colors.secondary} />
            <Text style={[styles.guestLocalTitle, { color: colors.primary }]}>
              Stored only on this device
            </Text>
            <Text
              style={[styles.guestLocalBody, { color: colors.onSurfaceVariant }]}
            >
              Cloud backup and sync require an account so your conservatory can
              be protected and restored across devices.
            </Text>
            <PrimaryButton
              label="Create account to back up"
              onPress={() => {
                void promptIfGuestRestricted({
                  feature: "cloud_backup",
                  returnTo: "/data-backup",
                });
              }}
              fullWidth
            />
          </View>
          <DataBackupExportCard
            onPress={() => router.push("/export-collection-data")}
          />
        </View>
      </ProfileScreenScaffold>
    );
  }

  const handleSync = () => {
    trackGtmEvent("backup_sync_started");
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        trackGtmEvent("backup_sync_completed", {
          outcome: result.outcome,
        });
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
        trackGtmEvent("backup_sync_failed", {
          reason: error instanceof Error ? error.message : "unknown",
        });
        void alert.show({
          variant: "error",
          title: "Backup update failed",
          message: getBackupSyncFailureMessage(error),
          primaryAction: { label: "Close", tone: "danger" },
        });
      },
    });
  };

  const handleToggleAutoSync = () => {
    const enabling = !autoSyncEnabled;
    autoSyncMutation.mutate(!autoSyncEnabled, {
      onSuccess: () => {
        trackGtmEvent(
          enabling ? "backup_auto_sync_enabled" : "backup_auto_sync_disabled",
        );
        snackbar.success(
          !autoSyncEnabled
            ? "Auto sync is now enabled for this conservatory."
            : "Auto sync is now off. Local saves remain on this device until you sync manually.",
        );
      },
      onError: (error) => {
        void alert.show({
          variant: "error",
          title: "Unable to update auto sync",
          message:
            error instanceof Error
              ? error.message
              : "We couldn't update the auto sync setting right now.",
          primaryAction: { label: "Close", tone: "danger" },
        });
      },
    });
  };

  return (
    <ProfileScreenScaffold
      title="Data & Backup"
      subtitle="Archive care"
      description="Review your conservatory's backup health, refresh cloud sync when needed, and open a portable export when you'd like to keep a copy close at hand."
    >
      <View style={styles.content}>
        <DataBackupHeroCard />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              CLOUD SYNC
            </Text>
            <View
              style={[
                styles.sectionRule,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
          </View>

          <CloudSyncControlCard
            title={cloudSyncTitle}
            description={cloudSyncDescription}
            enabled={autoSyncEnabled}
            disabled={autoSyncMutation.isPending || !canToggleAutoSync}
            statusTitle={overviewState}
            statusValue={overviewSecondaryValue}
            statusDetail={overviewSupportingLabel}
            onToggle={handleToggleAutoSync}
            onOpenDetails={() => router.push("/backup-details")}
          />

          <PrimaryButton
            label={isSyncRunning ? "Syncing Now..." : "Sync Now"}
            icon="sync"
            iconFamily="MaterialIcons"
            loading={isSyncRunning}
            disabled={isSyncRunning || !canSync}
            onPress={handleSync}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              EXPORT
            </Text>
            <View
              style={[
                styles.sectionRule,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
          </View>

          <DataBackupExportCard
            onPress={() => router.push("/export-collection-data")}
          />
          <PrimaryButton
            label="Restore From Export"
            icon="archive-arrow-up-outline"
            iconFamily="MaterialCommunityIcons"
            onPress={() => router.push("/import-collection-data")}
          />

          <View
            style={[
              styles.noteCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="info"
              size={20}
              color={colors.secondary}
            />
            <Text style={[styles.noteCopy, { color: colors.onSurfaceVariant }]}>
              Export files are prepared on-device and exclude sign-in
              credentials and password data.
            </Text>
          </View>
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2.1,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    opacity: 0.25,
  },
  noteCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noteCopy: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  guestLocalCard: {
    borderRadius: 24,
    padding: 24,
    gap: 12,
    alignItems: "flex-start",
  },
  guestLocalTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  guestLocalBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});

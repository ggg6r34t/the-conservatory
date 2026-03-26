import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { DataBackupExportCard } from "@/features/profile/components/DataBackupExportCard";
import { DataBackupHeroCard } from "@/features/profile/components/DataBackupHeroCard";
import { DataBackupOverviewCard } from "@/features/profile/components/DataBackupOverviewCard";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useBackupStatus } from "@/features/profile/hooks/useBackupStatus";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function DataBackupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const {
    overviewState,
    overviewSupportingLabel,
    overviewSecondaryValue,
    remoteAvailability,
    syncMutation,
    canSync,
  } = useBackupStatus();

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        snackbar.success("Your conservatory backup has been refreshed.");
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
              style={[styles.sectionRule, { backgroundColor: colors.outlineVariant }]}
            />
          </View>

          <DataBackupOverviewCard
            syncTitle={remoteAvailability.title}
            syncDescription={remoteAvailability.description}
            statusTitle={overviewState}
            statusValue={overviewSecondaryValue}
            statusDetail={overviewSupportingLabel}
            onOpenDetails={() => router.push("/backup-details")}
          />

          <PrimaryButton
            label={syncMutation.isPending ? "Syncing Now..." : "Sync Now"}
            icon="sync"
            iconFamily="MaterialIcons"
            loading={syncMutation.isPending}
            disabled={syncMutation.isPending || !canSync}
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
              style={[styles.sectionRule, { backgroundColor: colors.outlineVariant }]}
            />
          </View>

          <DataBackupExportCard
            onPress={() => router.push("/export-collection-data")}
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
              Export files are prepared on-device and exclude sign-in credentials
              and password data.
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
});

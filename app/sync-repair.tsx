import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import {
  listSyncRepairItems,
  retrySyncRepairItems,
} from "@/features/profile/services/syncRepairService";
import {
  canRetrySyncRepairItem,
  formatSyncRepairStatus,
} from "@/features/profile/services/syncDiagnosticsService";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSnackbar } from "@/hooks/useSnackbar";

function formatEntityLabel(entity: string) {
  return entity.replace(/_/g, " ");
}

function formatAttemptLabel(count: number) {
  return `${count} ${count === 1 ? "attempt" : "attempts"}`;
}

function formatItemDiagnostics(item: {
  operation: string;
  status: string;
  attemptCount: number;
}) {
  return `${item.operation.toUpperCase()} - ${formatSyncRepairStatus(item.status).toUpperCase()} - ${formatAttemptLabel(item.attemptCount)}`;
}

function formatRepairTimestampLabel(item: {
  queuedAt: string;
  updatedAt: string;
}) {
  return `Queued ${new Date(item.queuedAt).toLocaleString()} - Updated ${new Date(item.updatedAt).toLocaleString()}`;
}

export default function SyncRepairScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const repairQuery = useQuery({
    queryKey: ["sync-repair-items"],
    queryFn: listSyncRepairItems,
  });
  const retryMutation = useMutation({
    mutationFn: (ids?: string[]) =>
      retrySyncRepairItems(ids, { userId: user?.id }),
    onSuccess: async (_count, ids) => {
      snackbar.success(
        ids?.length
          ? "Backup item is ready to retry."
          : "Backup queue is ready to retry.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sync-repair-items"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-backup-summary"] }),
      ]);
    },
  });
  const items = repairQuery.data ?? [];
  const retryableItems = items.filter((item) => canRetrySyncRepairItem(item.status));

  return (
    <ProfileScreenScaffold
      title="Backup Repair"
      subtitle="Sync attention"
      description="Review local changes that need another backup pass and prepare them for retry."
    >
      {items.length ? (
        <View style={styles.section}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text style={[styles.title, { color: colors.primary }]}>
                {formatEntityLabel(item.entity)}
              </Text>
              <Text style={[styles.meta, { color: colors.secondary }]}>
                {formatItemDiagnostics(item)}
              </Text>
              <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                {item.lastError ??
                  "This item was interrupted before backup could finish."}
              </Text>
              <Text style={[styles.detail, { color: colors.onSurfaceVariant }]}>
                {formatRepairTimestampLabel(item)}
              </Text>
              <PrimaryButton
                label={
                  canRetrySyncRepairItem(item.status)
                    ? "Retry Item"
                    : "Informational Only"
                }
                disabled={
                  retryMutation.isPending || !canRetrySyncRepairItem(item.status)
                }
                loading={retryMutation.isPending}
                onPress={() => retryMutation.mutate([item.id])}
              />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          content={getEmptyStateForContext({ context: "sync.repairQueueEmpty" })}
          screen="sync_repair"
          reason="repair_queue_clear"
          style={styles.card}
        />
      )}

      <PrimaryButton
        label={retryMutation.isPending ? "Preparing Retry..." : "Retry Queue"}
        disabled={retryMutation.isPending || retryableItems.length === 0}
        loading={retryMutation.isPending}
        onPress={() => retryMutation.mutate(undefined)}
      />
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  meta: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  detail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});

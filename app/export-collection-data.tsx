import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useExportCollectionData } from "@/features/export/hooks/useExportCollectionData";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

function IncludedRow(props: { label: string; detail: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.includedRow}>
      <View style={styles.includedCopy}>
        <Text style={[styles.includedLabel, { color: colors.primary }]}>
          {props.label}
        </Text>
        <Text style={[styles.includedDetail, { color: colors.onSurfaceVariant }]}>
          {props.detail}
        </Text>
      </View>
      <Text style={[styles.includedValue, { color: colors.secondary }]}>
        {props.value}
      </Text>
    </View>
  );
}

export default function ExportCollectionDataScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { summaryQuery, exportMutation, shareAgain } = useExportCollectionData();
  const [shareAgainPending, setShareAgainPending] = useState(false);

  const summary = summaryQuery.data;
  const totalRecords =
    (summary?.plants ?? 0) +
    (summary?.careLogs ?? 0) +
    (summary?.photos ?? 0) +
    (summary?.reminders ?? 0) +
    (summary?.memorialEntries ?? 0);
  const isEmpty = summaryQuery.isSuccess && totalRecords === 0;

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      snackbar.success(
        result.shared
          ? "Your export is ready to share or save."
          : "Your export file has been prepared on this device.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't prepare your export right now.";
      void alert.show({
        variant: "error",
        title: "Unable to export collection",
        message,
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const handleShareAgain = async () => {
    if (!exportMutation.data || shareAgainPending) {
      return;
    }

    try {
      setShareAgainPending(true);
      const shared = await shareAgain(exportMutation.data.fileUri);
      snackbar.success(
        shared
          ? "Your export is ready to share or save."
          : "Your export remains saved on this device.",
      );
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to reopen export",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't reopen your export right now.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    } finally {
      setShareAgainPending(false);
    }
  };

  return (
    <ProfileScreenScaffold
      title="Export Collection Data"
      subtitle="Collection transfer"
      description="Create a structured file of your conservatory so your plant history can be safely kept, reviewed, or carried into your next chapter."
    >
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          PORTABLE ARCHIVE
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Your export is prepared on-device as a single record you can save for
          backup, safekeeping, or a future move into another system.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
          WHAT&apos;S INCLUDED
        </Text>
        <View
          style={[
            styles.card,
            styles.groupCard,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <IncludedRow
            label="Plant records"
            detail="Names, locations, notes, and care rhythm."
            value={String(summary?.plants ?? 0)}
          />
          <IncludedRow
            label="Care logs"
            detail="Logged actions, condition history, and written observations."
            value={String(summary?.careLogs ?? 0)}
          />
          <IncludedRow
            label="Notes"
            detail="Plant notes and reflective notes from your care history."
            value={String(summary?.notes ?? 0)}
          />
          <IncludedRow
            label="Memorial entries"
            detail="Archived specimens and their memorial details."
            value={String(summary?.memorialEntries ?? 0)}
          />
          <IncludedRow
            label="Reminders"
            detail="Reminder timing, next due dates, and enabled states."
            value={String(summary?.reminders ?? 0)}
          />
          <IncludedRow
            label="Photo metadata"
            detail="URIs, dimensions, timestamps, and primary-photo flags."
            value={String(summary?.photos ?? 0)}
          />
        </View>
        <Text style={[styles.supportingNote, { color: colors.onSurfaceVariant }]}>
          Sign-in credentials, password data, and billing details are not part of
          this export.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
          FORMAT
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            JSON export
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Your collection is prepared as a single JSON file so IDs, timestamps,
            reminders, notes, and photo metadata stay together in one complete
            record.
          </Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Nothing to export yet
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Add plants, care history, or memorial entries first, and your export
            will be ready when your archive begins to take shape.
          </Text>
        </View>
      ) : null}

      {exportMutation.data ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Export prepared
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            {exportMutation.data.fileName}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={shareAgainPending}
            onPress={handleShareAgain}
            style={styles.secondaryAction}
          >
            <Text style={[styles.secondaryActionLabel, { color: colors.primary }]}>
              {shareAgainPending ? "Preparing..." : "Share Again"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.ctaNote, { color: colors.onSurfaceVariant }]}>
        The file is created on-device and then opened in the system share sheet so
        you can save or send it where you prefer.
      </Text>

      <PrimaryButton
        label="Export Data"
        onPress={handleExport}
        loading={exportMutation.isPending}
        disabled={exportMutation.isPending || summaryQuery.isLoading || isEmpty}
      />
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2.1,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  groupCard: {
    gap: 14,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.8,
  },
  cardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  includedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  includedCopy: {
    flex: 1,
    gap: 4,
  },
  includedLabel: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  includedDetail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  includedValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  supportingNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  secondaryAction: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  secondaryActionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  ctaNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});

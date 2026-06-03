import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  previewCollectionImport,
  restoreCollectionImport,
  validateCollectionImportPayload,
  type CollectionImportPayload,
} from "@/features/export/services/importService";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { trackGtmEvent } from "@/services/analytics/analyticsService";

export default function ImportCollectionDataScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const [rawPayload, setRawPayload] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  let payload: CollectionImportPayload | null = null;
  let preview = null;
  try {
    if (rawPayload.trim()) {
      const parsed = JSON.parse(rawPayload) as unknown;
      validateCollectionImportPayload(parsed);
      payload = parsed;
      preview = previewCollectionImport(parsed);
    }
  } catch {
    payload = null;
    preview = null;
  }

  return (
    <ProfileScreenScaffold
      title="Restore Collection"
      subtitle="Portable archive"
      description="Paste a Conservatory JSON export to restore plants and care history into this local archive."
    >
      <View style={styles.content}>
        <TextInput
          value={rawPayload}
          onChangeText={setRawPayload}
          multiline
          textAlignVertical="top"
          placeholder="Paste export JSON"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceContainerLow,
              color: colors.onSurface,
            },
          ]}
        />

        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.previewTitle, { color: colors.primary }]}>
            {preview ? "Import preview" : "Waiting for valid export"}
          </Text>
          <Text
            style={[styles.previewBody, { color: colors.onSurfaceVariant }]}
          >
            {preview
              ? `${preview.plants} plants, ${preview.careLogs} care logs, ${preview.photos} photos, ${preview.reminders} reminders, ${preview.memorialEntries} memorials`
              : "No records will be restored until the export is valid and you confirm the import."}
          </Text>
        </View>

        <PrimaryButton
          label={isImporting ? "Restoring..." : "Restore Export"}
          icon="archive-arrow-up-outline"
          iconFamily="MaterialCommunityIcons"
          loading={isImporting}
          disabled={!payload || !user?.id || isImporting}
          onPress={() => {
            if (!payload || !user?.id) return;
            setIsImporting(true);
            trackGtmEvent("import_collection_started", {
              plants: preview?.plants ?? 0,
            });
            restoreCollectionImport({ userId: user.id, payload })
              .then((result) => {
                trackGtmEvent("import_collection_completed", {
                  plants: result.summary.plants,
                  care_logs: result.summary.careLogs,
                });
                const total =
                  result.summary.plants +
                  result.summary.careLogs +
                  result.summary.photos +
                  result.summary.reminders +
                  result.summary.memorialEntries;
                snackbar.success(`${total} records restored locally.`);
              })
              .catch((error) => {
                trackGtmEvent("import_collection_failed", {
                  reason: error instanceof Error ? error.message : "unknown",
                });
                void alert.show({
                  variant: "error",
                  title: "Restore failed",
                  message:
                    error instanceof Error
                      ? error.message
                      : "This export could not be restored.",
                  primaryAction: { label: "Close", tone: "danger" },
                });
              })
              .finally(() => setIsImporting(false));
          }}
        />
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  input: {
    minHeight: 220,
    borderRadius: 18,
    padding: 16,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  previewCard: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  previewBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
});

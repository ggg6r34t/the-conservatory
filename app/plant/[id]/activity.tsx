import { useMemo } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { FREE_CARE_LOG_HISTORY_DAYS } from "@/features/billing/constants";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useDeleteCareLog } from "@/features/care-logs/hooks/useDeleteCareLog";
import { PlantActivityEmptyState } from "@/features/plants/components/PlantActivityEmptyState";
import { PlantActivityHero } from "@/features/plants/components/PlantActivityHero";
import { PlantActivitySection } from "@/features/plants/components/PlantActivitySection";
import { usePlant } from "@/features/plants/hooks/usePlant";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import {
  buildPlantActivitySections,
  getPlantActivityHeroPhoto,
} from "@/features/plants/services/plantActivityTimeline";

export default function PlantActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { isPremium } = useSubscription();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const plantQuery = usePlant(id ?? "");
  const deleteCareLog = useDeleteCareLog(id ?? "");
  const sections = useMemo(
    () => (plantQuery.data ? buildPlantActivitySections(plantQuery.data) : []),
    [plantQuery.data],
  );
  const heroPhoto = plantQuery.data
    ? getPlantActivityHeroPhoto(plantQuery.data)
    : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 96,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Icon
                family="MaterialCommunityIcons"
                name="arrow-left"
                size={24}
                color={colors.primary}
              />
            </Pressable>

            <Text style={[styles.topBarTitle, { color: colors.primary }]}>
              Recent Activity
            </Text>
          </View>
        </View>

        {plantQuery.data ? (
          <>
            <PlantActivityHero
              plant={plantQuery.data.plant}
              photo={heroPhoto}
            />

            {!isPremium ? (
              <Text
                style={[styles.historyNotice, { color: colors.onSurfaceVariant }]}
              >
                Showing the last {FREE_CARE_LOG_HISTORY_DAYS} days of care
                history. Premium unlocks your full journal.
              </Text>
            ) : null}

            {sections.length > 0 ? (
              <View style={[styles.sections, { gap: spacing.xl }]}>
                {sections.map((section) => (
                  <PlantActivitySection
                    key={section.key}
                    section={section}
                    onDeleteCareLog={(careLogId) => {
                      void (async () => {
                        const confirmed = await alert.confirm({
                          variant: "destructive",
                          title: "Delete care entry?",
                          message:
                            "This removes the log from your journal on this device and queues the deletion for backup sync.",
                          primaryAction: { label: "Delete", tone: "danger" },
                          secondaryAction: { label: "Cancel" },
                        });

                        if (!confirmed) {
                          return;
                        }

                        try {
                          await deleteCareLog.mutateAsync(careLogId);
                          snackbar.success("Care entry deleted.");
                        } catch (error) {
                          await alert.show({
                            variant: "error",
                            title: "Unable to delete care entry",
                            message:
                              error instanceof Error
                                ? error.message
                                : "Try again in a moment.",
                            primaryAction: { label: "Close", tone: "danger" },
                          });
                        }
                      })();
                    }}
                  />
                ))}
              </View>
            ) : (
              <PlantActivityEmptyState />
            )}
          </>
        ) : (
          <View style={[styles.missingState, { gap: spacing.sm }]}>
            <Text style={[styles.missingTitle, { color: colors.primary }]}>
              Specimen not found
            </Text>
            <Text
              style={[styles.missingBody, { color: colors.onSurfaceVariant }]}
            >
              This entry may have been deleted or not loaded yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  sections: {
    paddingTop: 4,
  },
  missingState: {
    paddingTop: 4,
  },
  missingTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 34,
    lineHeight: 40,
  },
  missingBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
  historyNotice: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { useLogs } from "@/features/care-logs/hooks/useLogs";
import { usePlant } from "@/features/plants/hooks/usePlant";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import type { CareLog } from "@/types/models";

function formatJournalDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatJournalHeading(log: CareLog) {
  switch (log.logType) {
    case "water":
      return "Hydration Ritual";
    case "mist":
      return "Humidity Reset";
    case "feed":
      return "Nutrient Session";
    case "prune":
      return "Fresh Pruning";
    case "pest":
      return "Recovery Check";
    case "note":
    default:
      return "Growth Note";
  }
}

function formatJournalBody(log: CareLog, plantName: string) {
  if (log.notes?.trim()) {
    return log.notes.trim();
  }

  switch (log.logType) {
    case "water":
      return `${plantName} was watered and reset into its next growth cycle.`;
    case "mist":
      return `A quick misting session helped ${plantName} settle back into balanced humidity.`;
    case "feed":
      return `${plantName} was fed to support steady, healthy development.`;
    case "prune":
      return `Selective pruning kept ${plantName} shaped and encouraged cleaner new growth.`;
    case "pest":
      return `${plantName} was checked and treated to keep the foliage resilient.`;
    case "note":
    default:
      return `${plantName} added a new moment worth preserving in the journal.`;
  }
}

export default function JournalScreen() {
  const { colors, spacing } = useTheme();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const plantsQuery = usePlants();
  const plants = plantsQuery.data ?? [];
  const featuredPlant = plants[0];
  const plantQuery = usePlant(featuredPlant?.id ?? "");
  const plantDetail = plantQuery.data;
  const logsQuery = useLogs(featuredPlant?.id ?? "");
  const logs = logsQuery.data ?? [];
  const galleryPhotos =
    plantDetail?.photos.filter((photo) => photo.localUri || photo.remoteUrl) ?? [];
  const galleryUris = galleryPhotos
    .slice(0, 3)
    .map((photo) => photo.localUri ?? photo.remoteUrl ?? "")
    .filter(Boolean);
  const heroImageUri =
    galleryUris[0] ?? featuredPlant?.primaryPhotoUri ?? undefined;

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <AppHeader title="Journal" subtitle="Growth timeline" />

        {featuredPlant ? (
          <>
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                GROWTH TIMELINE
              </Text>
              <Text style={[styles.title, { color: colors.primary }]}>
                {featuredPlant.speciesName}
              </Text>
            </View>

            <View style={styles.galleryRow}>
              {(galleryUris.length ? galleryUris : [heroImageUri, heroImageUri, heroImageUri]).map(
                (uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.galleryCard}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={styles.galleryImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.galleryFallback,
                          { backgroundColor: colors.surfaceContainerHigh },
                        ]}
                      />
                    )}
                  </View>
                ),
              )}
            </View>

            <View style={styles.timeline}>
              {logs.length ? (
                logs.map((log) => (
                  <View key={log.id} style={styles.entry}>
                    <Text style={[styles.entryDate, { color: colors.secondary }]}>
                      {formatJournalDate(log.loggedAt).toUpperCase()}
                    </Text>
                    <Text style={[styles.entryTitle, { color: colors.onSurface }]}>
                      {formatJournalHeading(log)}
                    </Text>
                    <View style={styles.entryMediaWrap}>
                      {heroImageUri ? (
                        <Image
                          source={{ uri: heroImageUri }}
                          style={styles.entryImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.entryImage,
                            { backgroundColor: colors.surfaceContainerLow },
                          ]}
                        />
                      )}
                    </View>
                    <Text style={[styles.entryBody, { color: colors.onSurfaceVariant }]}>
                      {formatJournalBody(log, featuredPlant.name)}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.surfaceContainerLow },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                    No journal entries yet
                  </Text>
                  <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
                    Log watering, pruning, and observations to build a visual
                    timeline for {featuredPlant.name}.
                  </Text>
                  <PrimaryButton
                    href={`/care-log/${featuredPlant.id}` as const}
                    icon="camera-outline"
                    label="Add Photo"
                  />
                </View>
              )}
            </View>
          </>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>
              Journal coming to life
            </Text>
            <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
              Add your first plant to start a growth timeline and preserve care
              moments in one place.
            </Text>
            <PrimaryButton href="/plant/add" icon="plus" label="Add Plant" />
          </View>
        )}
      </ScrollView>

      {featuredPlant ? (
        <View style={styles.footerButton}>
          <PrimaryButton
            compact
            href={`/care-log/${featuredPlant.id}` as const}
            icon="camera-outline"
            label="Add Photo"
          />
        </View>
      ) : null}
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
  heroCopy: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  galleryRow: {
    flexDirection: "row",
    gap: 10,
  },
  galleryCard: {
    flex: 1,
    height: 142,
    borderRadius: 6,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryFallback: {
    width: "100%",
    height: "100%",
  },
  timeline: {
    gap: 26,
  },
  entry: {
    gap: 10,
  },
  entryDate: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    alignSelf: "flex-start",
    backgroundColor: "#fff0e9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entryTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 19,
    lineHeight: 26,
  },
  entryMediaWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  entryImage: {
    width: "100%",
    height: 264,
  },
  entryBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 28,
  },
  emptyCard: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
  footerButton: {
    position: "absolute",
    right: 16,
    bottom: 84,
  },
});

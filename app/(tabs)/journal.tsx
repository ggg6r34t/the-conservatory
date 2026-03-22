import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { queryKeys } from "@/config/constants";
import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { getFloatingActionBottomOffset } from "@/components/navigation/tabBarMetrics";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import type { CareLog } from "@/types/models";

type JournalEntry = {
  log: CareLog;
  plant: PlantListItem;
};

function formatMonthYear(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatHighlightDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
  }).format(new Date(value));
}

function formatSectionLabel(value: Date) {
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetDay = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const differenceInDays = Math.round(
    (currentDay.getTime() - targetDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (differenceInDays === 0) {
    return "Today";
  }

  if (differenceInDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEntryCopy(log: CareLog, plantName: string) {
  if (log.notes?.trim()) {
    return log.notes.trim();
  }

  switch (log.logType) {
    case "water":
      return `Deep soak given, filtered water.`;
    case "mist":
      return `Light misting for ${plantName.toLowerCase()}.`;
    case "feed":
      return `Fed to support a healthy new growth cycle.`;
    case "prune":
      return `Pruned back a few leaves for shape.`;
    case "pest":
      return `Routine pest inspection and cleanup.`;
    case "note":
    default:
      return `Captured a new observation for ${plantName.toLowerCase()}.`;
  }
}

function getLogIconName(logType: CareLog["logType"]) {
  switch (logType) {
    case "water":
      return "water";
    case "mist":
      return "water-outline";
    case "feed":
      return "white-balance-sunny";
    case "prune":
      return "content-cut";
    case "pest":
      return "ladybug";
    case "note":
    default:
      return "flash";
  }
}

function getLogIconColor(logType: CareLog["logType"], colors: ReturnType<typeof useTheme>["colors"]) {
  switch (logType) {
    case "prune":
      return colors.secondaryOnContainer;
    case "feed":
      return colors.primary;
    case "pest":
      return colors.error;
    case "note":
      return colors.onSurface;
    case "mist":
    case "water":
    default:
      return colors.primary;
  }
}

function buildSections(entries: JournalEntry[]) {
  const sections = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
    const label = formatSectionLabel(new Date(entry.log.loggedAt));
    const existing = sections.get(label) ?? [];
    existing.push(entry);
    sections.set(label, existing);
  }

  return Array.from(sections.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}

export default function JournalScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const plantsQuery = usePlants();
  const plants = plantsQuery.data ?? [];
  const featuredPlant = plants[0];
  const fabBottomOffset = getFloatingActionBottomOffset(insets.bottom);

  const logQueries = useQueries({
    queries: plants.map((plant) => ({
      queryKey: queryKeys.careLogs(plant.id),
      queryFn: () => listCareLogs(plant.id),
      enabled: Boolean(plant.id),
    })),
  });

  const entries = logQueries
    .flatMap((query, index) =>
      (query.data ?? []).map((log) => ({
        log,
        plant: plants[index],
      })),
    )
    .sort((left, right) => right.log.loggedAt.localeCompare(left.log.loggedAt));

  const sections = buildSections(entries);
  const monthLabel = formatMonthYear(new Date());
  const monthlyHighlights = plants
    .filter((plant) => plant.primaryPhotoUri)
    .slice(0, 6)
    .map((plant) => {
      const latestLog = entries.find((entry) => entry.plant.id === plant.id)?.log;

      return {
        id: plant.id,
        name: plant.name,
        imageUri: plant.primaryPhotoUri!,
        dateLabel: formatHighlightDate(latestLog?.loggedAt ?? plant.updatedAt),
      };
    });

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
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: featuredPlant ? fabBottomOffset + 84 : 96,
          },
        ]}
      >
        <AppHeader title="Journal" subtitle="Growth timeline" />

        {featuredPlant ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                  CARE JOURNAL
                </Text>
                <Text style={[styles.heroTitle, { color: colors.primary }]}>
                  Your Field{"\n"}Notes
                </Text>
              </View>
              <Text style={[styles.monthStamp, { color: colors.onSurface }]}>
                {monthLabel.replace(" ", "\n")}
              </Text>
            </View>

            <View style={styles.highlightsHeader}>
              <Text style={[styles.highlightsTitle, { color: colors.onSurface }]}>
                Monthly Highlights
              </Text>
              <Text style={[styles.viewAll, { color: colors.secondaryOnContainer }]}>
                VIEW ALL
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.highlightsRow}
            >
              {monthlyHighlights.map((highlight) => (
                <Link href={`/plant/${highlight.id}` as const} key={highlight.id} asChild>
                  <View style={styles.highlightCard}>
                    <Image
                      source={{ uri: highlight.imageUri }}
                      style={styles.highlightImage}
                      contentFit="cover"
                    />
                    <View style={styles.highlightDateWrap}>
                      <Text style={styles.highlightDate}>{highlight.dateLabel.toUpperCase()}</Text>
                    </View>
                  </View>
                </Link>
              ))}
            </ScrollView>

            {sections.length ? (
              <View style={styles.sections}>
                {sections.map((section) => (
                  <View key={section.title} style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                        {section.title}
                      </Text>
                      <View
                        style={[
                          styles.sectionRule,
                          { backgroundColor: colors.surfaceContainerHigh },
                        ]}
                      />
                    </View>

                    <View style={styles.entries}>
                      {section.items.map(({ log, plant }) => (
                        <View
                          key={log.id}
                          style={[
                            styles.entryCard,
                            { backgroundColor: colors.surfaceContainerLow },
                          ]}
                        >
                          <View
                            style={[
                              styles.iconTile,
                              { backgroundColor: colors.surfaceContainerLowest },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={getLogIconName(log.logType)}
                              size={24}
                              color={getLogIconColor(log.logType, colors)}
                            />
                          </View>

                          <View style={styles.entryCopy}>
                            <Text style={[styles.entryPlant, { color: colors.primary }]}>
                              {plant.name}
                            </Text>
                            <Text
                              style={[styles.entryNote, { color: colors.onSurfaceVariant }]}
                              numberOfLines={2}
                            >
                              {formatEntryCopy(log, plant.name)}
                            </Text>
                            <Text
                              style={[styles.entryTime, { color: colors.onSurfaceVariant }]}
                            >
                              {formatTime(log.loggedAt)}
                            </Text>
                          </View>

                          {plant.primaryPhotoUri ? (
                            <Image
                              source={{ uri: plant.primaryPhotoUri }}
                              style={styles.entryThumb}
                              contentFit="cover"
                            />
                          ) : (
                            <View
                              style={[
                                styles.entryThumb,
                                { backgroundColor: colors.surfaceContainerHigh },
                              ]}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.surfaceContainerLow },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                  No field notes yet
                </Text>
                <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
                  Start logging care moments to build a journal of your collection.
                </Text>
              </View>
            )}
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
              Add your first plant to start a care journal and preserve each ritual.
            </Text>
            <PrimaryButton href="/plant/add" icon="plus" label="Add Plant" />
          </View>
        )}
      </ScrollView>

      {featuredPlant ? (
        <View style={[styles.footerButton, { bottom: fabBottomOffset }]}>
          <PrimaryButton
            compact
            href={`/care-log/${featuredPlant.id}` as const}
            icon="plus"
            label="Add Log"
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
    gap: 32,
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  heroCopy: {
    flex: 1,
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.6,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 56,
    lineHeight: 60,
  },
  monthStamp: {
    fontFamily: "Manrope_500Medium",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "right",
    marginTop: 54,
  },
  highlightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightsTitle: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 22,
    lineHeight: 30,
  },
  viewAll: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  highlightsRow: {
    gap: 14,
    paddingRight: 24,
  },
  highlightCard: {
    width: 198,
    height: 254,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  highlightImage: {
    width: "100%",
    height: "100%",
  },
  highlightDateWrap: {
    position: "absolute",
    left: 14,
    bottom: 14,
  },
  highlightDate: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.6,
    color: "#ffffff",
  },
  sections: {
    gap: 34,
  },
  sectionBlock: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 24,
    lineHeight: 32,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    borderRadius: 999,
  },
  entries: {
    gap: 18,
  },
  entryCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryPlant: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 26,
  },
  entryNote: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 15,
    lineHeight: 23,
  },
  entryTime: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  entryThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
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
    right: 18,
  },
});

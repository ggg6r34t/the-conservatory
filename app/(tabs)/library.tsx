import { memo, useEffect, useMemo } from "react";

import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { useCareLogsForPlantIds } from "@/features/care-logs/hooks/useCareLogsForPlantIds";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import { useReminders } from "@/features/notifications/hooks/useReminders";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { PlantStatusBadge } from "@/features/plants/components/PlantStatusBadge";
import { usePlants } from "@/features/plants/hooks/usePlants";
import {
  groupPlantsForAdvancedFilter,
  isPremiumLibraryFilter,
} from "@/features/plants/services/plantLibraryFilterService";
import {
  buildPlantStatusMap,
  type PlantStatusMap,
} from "@/features/plants/services/plantLibraryStatusService";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { formatDueLabel } from "@/utils/dateFormatter";
import type { BotanicalTokens } from "@/styles/tokens";
import type { PlantLibraryFilter } from "@/types/ui";

function formatMetaLabel(nextWateringDate: string | null) {
  return `NEXT WATER: ${formatDueLabel(nextWateringDate).toUpperCase()}`;
}

// Pair of plants that forms one row in the 2-column grid.
type PlantRow = [PlantListItem] | [PlantListItem, PlantListItem];

function chunkPlants(plants: PlantListItem[]): PlantRow[] {
  const rows: PlantRow[] = [];
  for (let index = 0; index < plants.length; index += 2) {
    const pair = plants.slice(index, index + 2) as PlantRow;
    rows.push(pair);
  }
  return rows;
}

type LibraryListItem =
  | { type: "section"; key: string; title: string }
  | { type: "row"; key: string; row: PlantRow };

function buildLibraryListItems(
  plants: PlantListItem[],
  filter: PlantLibraryFilter,
): LibraryListItem[] {
  if (!isPremiumLibraryFilter(filter)) {
    return chunkPlants(plants).map((row, index) => ({
      type: "row",
      key: `row-${index}`,
      row,
    }));
  }

  const items: LibraryListItem[] = [];

  for (const section of groupPlantsForAdvancedFilter(plants, filter)) {
    items.push({
      type: "section",
      key: `section-${section.title}`,
      title: section.title,
    });

    chunkPlants(section.plants).forEach((row, index) => {
      items.push({
        type: "row",
        key: `${section.title}-row-${index}`,
        row,
      });
    });
  }

  return items;
}

function getLibraryCardMetaLabel(
  plant: PlantListItem,
  filter: PlantLibraryFilter,
  nextWateringDate: string | null,
) {
  if (filter === "by-species" && plant.location?.trim()) {
    return plant.location.trim().toUpperCase();
  }

  if (filter === "by-location") {
    return plant.speciesName.toUpperCase();
  }

  return formatMetaLabel(nextWateringDate);
}

// ─── Memoized single plant card ────────────────────────────────────────────

interface LibraryCardProps {
  plant: PlantListItem;
  plantStatusMap: PlantStatusMap;
  colors: BotanicalTokens["colors"];
  filter: PlantLibraryFilter;
}

const LibraryCard = memo(function LibraryCard({
  plant,
  plantStatusMap,
  colors,
  filter,
}: LibraryCardProps) {
  const plantStatus = plantStatusMap.get(plant.id);
  const needsAttention = plantStatus?.healthState === "needs_attention";

  return (
    <Link href={`/plant/${plant.id}` as const} key={plant.id} asChild>
      <Pressable style={styles.card}>
        <View
          style={[
            styles.media,
            {
              backgroundColor: plant.primaryPhotoUri
                ? colors.surfaceContainerLowest
                : colors.surfaceContainerLow,
            },
          ]}
        >
          {plant.primaryPhotoUri ? (
            <Image
              source={{ uri: plant.primaryPhotoUri }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={[
                styles.fallback,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            />
          )}
          {plantStatus ? (
            <PlantStatusBadge
              healthState={plantStatus.healthState}
              variant="compact"
              style={styles.statusChip}
            />
          ) : null}
        </View>

        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.onSurface }]}>
            {plant.name}
          </Text>
          <Text
            style={[
              styles.meta,
              {
                color: needsAttention
                  ? colors.error
                  : colors.onSurfaceVariant,
              },
            ]}
          >
            {getLibraryCardMetaLabel(
              plant,
              filter,
              plantStatus?.effectiveNextWateringDate ?? null,
            )}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
});

// ─── Memoized row (renders two LibraryCards side by side) ──────────────────

interface PlantRowItemProps {
  row: PlantRow;
  plantStatusMap: PlantStatusMap;
  colors: BotanicalTokens["colors"];
  filter: PlantLibraryFilter;
}

const PlantRowItem = memo(function PlantRowItem({
  row,
  plantStatusMap,
  colors,
  filter,
}: PlantRowItemProps) {
  return (
    <View style={styles.galleryRow}>
      {row.map((plant) => (
        <LibraryCard
          key={plant.id}
          plant={plant}
          plantStatusMap={plantStatusMap}
          colors={colors}
          filter={filter}
        />
      ))}
      {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
    </View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const plantsQuery = usePlants();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const filter = usePlantStore((state) => state.filter);
  const query = usePlantStore((state) => state.query);
  const setFilter = usePlantStore((state) => state.setFilter);
  const setQuery = usePlantStore((state) => state.setQuery);

  useEffect(() => {
    if (!isPremium && isPremiumLibraryFilter(filter)) {
      setFilter("all");
    }
  }, [filter, isPremium, setFilter]);

  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);
  const remindersQuery = useReminders();
  const plantIds = useMemo(() => plants.map((p) => p.id), [plants]);
  const logsQuery = useCareLogsForPlantIds(plantIds, "library", {
    isPremium,
  });
  const plantStatusMap = useMemo(
    () =>
      buildPlantStatusMap({
        plants,
        reminders: remindersQuery.data ?? [],
        logs: logsQuery.data ?? [],
      }),
    [logsQuery.data, plants, remindersQuery.data],
  );
  const libraryListItems = useMemo(
    () => buildLibraryListItems(plants, filter),
    [filter, plants],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <AppHeader title="Living Gallery" subtitle="Your collection" />
        <TextInputField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Find a monstera, ficus, or pothos"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { label: "All", value: "all" as const },
            { label: "Needs Water", value: "needs-water" as const },
            { label: "Thriving", value: "thriving" as const },
            { label: "Recently Watered", value: "recently-watered" as const },
            { label: "With Notes", value: "with-notes" as const },
            { label: "Unplaced", value: "unplaced" as const },
          ].map((option) => {
            const isActive = option.value === filter;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.tertiaryContainer
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive
                        ? colors.surfaceBright
                        : colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          {[
            {
              label: "By Location",
              value: "by-location" as const,
              premiumFeature: "advanced_library_filters" as const,
            },
            {
              label: "By Species",
              value: "by-species" as const,
              premiumFeature: "advanced_library_filters" as const,
            },
          ].map((option) => {
            const isActive = filter === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  if (!isPremium) {
                    trackMonetizationEvent("upgrade_prompt_viewed", {
                      feature: option.premiumFeature,
                    });
                    router.push("/premium");
                    return;
                  }

                  setFilter(option.value);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.tertiaryContainer
                      : colors.surfaceContainerHigh,
                    opacity: isPremium ? 1 : 0.55,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                  {!isPremium ? (
                    <Text style={[styles.chipPremiumIcon, { color: colors.primary }]}>
                      {" "}
                      ✦
                    </Text>
                  ) : null}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    ),
    // router is intentionally omitted: useRouter() returns a stable singleton
    // reference in Expo Router so it never triggers a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, filter, isPremium, query, setFilter, setQuery],
  );

  const EmptyState = useMemo(
    () => (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View style={styles.emptyCopy}>
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            Your conservatory is quiet.
          </Text>
          <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
            Every collection starts with a single specimen. Begin your botanical
            archive today.
          </Text>
          <PrimaryButton label="Add First Specimen" href="/plant/add" />
        </View>
      </View>
    ),
    [colors],
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <FlatList
        data={libraryListItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) =>
          item.type === "section" ? (
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {item.title}
            </Text>
          ) : (
            <PlantRowItem
              row={item.row}
              plantStatusMap={plantStatusMap}
              colors={colors}
              filter={filter}
            />
          )
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 113,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 38,
  },
  listHeader: {
    gap: 24,
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  chipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  chipPremiumIcon: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 4,
  },
  galleryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  card: {
    flex: 1,
    gap: 14,
  },
  cardSpacer: {
    flex: 1,
  },
  media: {
    height: 228,
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-start",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
  },
  statusChip: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  copy: {
    gap: 6,
    paddingHorizontal: 2,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 21,
    lineHeight: 28,
  },
  meta: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
  },
  emptyCard: {
    borderRadius: 28,
    minHeight: 240,
    padding: 24,
    justifyContent: "center",
  },
  emptyCopy: {
    gap: 16,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 46,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});

import { Image } from "expo-image";
import { Link } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { formatDueLabel } from "@/utils/dateFormatter";

function getPlantStatus(plant: PlantListItem) {
  if (!plant.nextWaterDueAt) {
    return "THRIVING";
  }

  return new Date(plant.nextWaterDueAt).getTime() <= Date.now()
    ? "NEEDS WATER"
    : "THRIVING";
}

function formatMetaLabel(plant: PlantListItem) {
  return `NEXT WATER: ${formatDueLabel(plant.nextWaterDueAt).toUpperCase()}`;
}

function chunkPlants(plants: PlantListItem[]) {
  const rows: PlantListItem[][] = [];

  for (let index = 0; index < plants.length; index += 2) {
    rows.push(plants.slice(index, index + 2));
  }

  return rows;
}

export default function LibraryScreen() {
  const { colors, spacing } = useTheme();
  const plantsQuery = usePlants();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const filter = usePlantStore((state) => state.filter);
  const query = usePlantStore((state) => state.query);
  const setFilter = usePlantStore((state) => state.setFilter);
  const setQuery = usePlantStore((state) => state.setQuery);
  const plants = plantsQuery.data ?? [];
  const plantRows = chunkPlants(plants);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
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
                      color: isActive ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {plants.length ? (
          <View style={styles.gallery}>
            {plantRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.galleryRow}>
                {row.map((plant) => {
                  const status = getPlantStatus(plant);
                  const isThriving = status === "THRIVING";

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
                            />
                          ) : (
                            <View
                              style={[
                                styles.fallback,
                                { backgroundColor: colors.surfaceContainerLow },
                              ]}
                            />
                          )}

                          <View
                            style={[
                              styles.statusChip,
                              {
                                backgroundColor: isThriving
                                  ? colors.primaryContainer
                                  : colors.secondaryContainer,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusChipLabel,
                                {
                                  color: isThriving
                                    ? colors.surfaceBright
                                    : colors.secondaryOnContainer,
                                },
                              ]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.copy}>
                          <Text style={[styles.name, { color: colors.onSurface }]}>
                            {plant.name}
                          </Text>
                          <Text
                            style={[
                              styles.meta,
                              {
                                color: isThriving ? colors.onSurfaceVariant : colors.error,
                              },
                            ]}
                          >
                            {formatMetaLabel(plant)}
                          </Text>
                        </View>
                      </Pressable>
                    </Link>
                  );
                })}

                {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
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
            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                Your conservatory is quiet.
              </Text>
              <Text
                style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}
              >
                Every collection starts with a single specimen. Begin your
                botanical archive today.
              </Text>
              <PrimaryButton label="Add First Specimen" href="/plant/add" />
            </View>
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
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  chipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  gallery: {
    gap: 38,
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
    borderRadius: 18,
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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusChipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.3,
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

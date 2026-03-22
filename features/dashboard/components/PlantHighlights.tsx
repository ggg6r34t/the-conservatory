import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { formatDueLabel, formatEditorialDate } from "@/utils/dateFormatter";

interface PlantHighlightsProps {
  plants: PlantListItem[];
}

function getPlantStatus(plant: PlantListItem) {
  if (!plant.nextWaterDueAt) {
    return "THRIVING";
  }

  return new Date(plant.nextWaterDueAt).getTime() <= Date.now()
    ? "NEEDS ATTENTION"
    : "THRIVING";
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function PlantImage({ plant, style }: { plant: PlantListItem; style: object }) {
  const { colors } = useTheme();

  if (plant.primaryPhotoUri) {
    return (
      <Image
        source={{ uri: plant.primaryPhotoUri }}
        style={style}
        contentFit="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.primaryContainer, colors.primary]}
      start={{ x: 0.15, y: 0.05 }}
      end={{ x: 0.85, y: 1 }}
      style={style}
    >
      <MaterialCommunityIcons
        color={colors.primaryFixed}
        name="sprout"
        size={44}
      />
    </LinearGradient>
  );
}

export function PlantHighlights({ plants }: PlantHighlightsProps) {
  const { colors } = useTheme();
  const featuredPlant = plants[0];
  const secondaryPlants = plants.slice(1, 3);
  const leftSecondaryPlant = secondaryPlants[0];
  const rightSecondaryPlant = secondaryPlants[1];
  const timelinePlants = plants.slice(0, 5);

  if (!featuredPlant) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.primary }]}>
          Your gallery is ready for its first specimen.
        </Text>
        <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
          Add a plant to unlock featured photography, hydration insights, and a
          living timeline.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Link href={`/plant/${featuredPlant.id}` as const} asChild>
        <Pressable style={styles.featuredLink}>
          <View style={styles.featuredCard}>
            <View style={styles.featuredMedia}>
              <PlantImage plant={featuredPlant} style={styles.featuredImage} />
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                <Text style={[styles.chipLabel, { color: colors.primary }]}>
                  {getPlantStatus(featuredPlant)}
                </Text>
              </View>
            </View>
            <View style={styles.featuredCopyRow}>
              <View style={styles.featuredCopy}>
                <Text
                  style={[styles.featuredName, { color: colors.onSurface }]}
                >
                  {featuredPlant.name}
                </Text>
                <Text
                  style={[
                    styles.featuredSpecies,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {featuredPlant.speciesName}
                </Text>
              </View>
              <View style={styles.featuredMeta}>
                <Text
                  style={[
                    styles.metaEyebrow,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  WATER IN
                </Text>
                <Text style={[styles.metaValue, { color: colors.onSurface }]}>
                  {toTitleCase(formatDueLabel(featuredPlant.nextWaterDueAt))}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryColumn}>
          {leftSecondaryPlant ? (
            <Link href={`/plant/${leftSecondaryPlant.id}` as const} asChild>
              <Pressable style={styles.secondaryCard}>
                <View
                  style={[
                    styles.secondaryMedia,
                    styles.secondaryCardCompactMedia,
                  ]}
                >
                  <PlantImage
                    plant={leftSecondaryPlant}
                    style={styles.secondaryImage}
                  />
                  <View
                    style={[
                      styles.statusCard,
                      { backgroundColor: colors.surfaceContainerLowest },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      STATUS
                    </Text>
                    <Text style={[styles.statusValue, { color: colors.error }]}>
                      NEEDS
                    </Text>
                    <Text style={[styles.statusValue, { color: colors.error }]}>
                      ATTENTION
                    </Text>
                  </View>
                </View>
                <View style={styles.secondaryCopy}>
                  <Text
                    style={[styles.secondaryName, { color: colors.onSurface }]}
                  >
                    {leftSecondaryPlant.name}
                  </Text>
                  <Text
                    style={[
                      styles.secondaryMeta,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {formatDueLabel(
                      leftSecondaryPlant.nextWaterDueAt,
                    ).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ) : null}
        </View>

        <View style={[styles.secondaryColumn, styles.secondaryColumnOffset]}>
          {rightSecondaryPlant ? (
            <Link href={`/plant/${rightSecondaryPlant.id}` as const} asChild>
              <Pressable style={styles.secondaryCard}>
                <View
                  style={[styles.secondaryMedia, styles.secondaryCardTallMedia]}
                >
                  <PlantImage
                    plant={rightSecondaryPlant}
                    style={styles.secondaryImage}
                  />
                  <View
                    style={[
                      styles.secondaryDot,
                      { backgroundColor: colors.surfaceContainerLowest },
                    ]}
                  >
                    <View
                      style={[
                        styles.secondaryDotInner,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.secondaryCopy}>
                  <Text
                    style={[styles.secondaryName, { color: colors.onSurface }]}
                  >
                    {rightSecondaryPlant.name}
                  </Text>
                  <Text
                    style={[
                      styles.secondaryMeta,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {formatDueLabel(
                      rightSecondaryPlant.nextWaterDueAt,
                    ).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ) : null}
        </View>
      </View>

      <View style={styles.timelineHeader}>
        <View style={styles.timelineCopy}>
          <Text style={[styles.timelineEyebrow, { color: colors.secondary }]}>
            LEGACY
          </Text>
          <Text style={[styles.timelineTitle, { color: colors.primary }]}>
            Growth{"\n"}Timeline
          </Text>
        </View>
        <Link href="/archive-gallery" asChild>
          <Pressable style={styles.timelineLinkWrap}>
            <Text style={[styles.timelineLink, { color: colors.onSurface }]}>
              VIEW ARCHIVE
            </Text>
            <View
              style={[
                styles.timelineUnderline,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            />
          </Pressable>
        </Link>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineRow}
      >
        {timelinePlants.map((plant) => (
          <Link href={`/plant/${plant.id}` as const} key={plant.id} asChild>
            <Pressable style={styles.timelineCard}>
              <PlantImage plant={plant} style={styles.timelineImage} />
              <Text
                style={[
                  styles.timelineDate,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {formatEditorialDate(plant.updatedAt).toUpperCase()}
              </Text>
              <Text style={[styles.timelineName, { color: colors.onSurface }]}>
                {plant.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 42,
  },
  emptyState: {
    gap: 10,
    paddingVertical: 12,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  featuredLink: {
    width: "100%",
  },
  featuredCard: {
    gap: 16,
    width: "100%",
  },
  featuredMedia: {
    height: 348,
    borderRadius: 32,
    overflow: "hidden",
    justifyContent: "flex-start",
    backgroundColor: "#1f4e46",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.1,
  },
  featuredCopyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  featuredCopy: {
    flex: 1,
    gap: 3,
  },
  featuredName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 31,
  },
  featuredSpecies: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  featuredMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
  metaEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.8,
  },
  metaValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  secondaryColumn: {
    flex: 1,
    gap: 12,
  },
  secondaryColumnOffset: {
    paddingTop: 22,
  },
  secondaryCard: {
    width: "100%",
    gap: 10,
  },
  secondaryMedia: {
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f6f4ef",
  },
  secondaryCardCompactMedia: {
    height: 176,
  },
  secondaryCardTallMedia: {
    height: 208,
  },
  secondaryImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCopy: {
    gap: 6,
    paddingHorizontal: 4,
  },
  statusCard: {
    position: "absolute",
    left: 12,
    bottom: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  statusValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
  },
  secondaryDot: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  secondaryName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 23,
  },
  secondaryMeta: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
  },
  timelineCopy: {
    gap: 8,
  },
  timelineEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2.4,
  },
  timelineTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 31,
  },
  timelineLinkWrap: {
    alignItems: "flex-end",
    gap: 8,
  },
  timelineLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textAlign: "right",
  },
  timelineUnderline: {
    width: 42,
    height: 2,
    borderRadius: 999,
  },
  timelineRow: {
    gap: 18,
    paddingRight: 24,
  },
  timelineCard: {
    width: 276,
    gap: 8,
  },
  timelineImage: {
    width: 276,
    height: 372,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDate: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  timelineName: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
  },
});

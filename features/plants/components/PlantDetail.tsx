import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantDetailHealthInsight } from "@/features/ai/components/PlantDetailHealthInsight";
import { buildCareDefaults } from "@/features/ai/services/careDefaultsService";
import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import { useAddPlantProgressPhoto } from "@/features/plants/hooks/useAddPlantProgressPhoto";
import {
  capturePlantImage,
  pickPlantImage,
} from "@/features/plants/services/photoService";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { shadowScale, shadowWithColor } from "@/styles/shadows";
import type {
  CareLogCondition,
  CareLogType,
  Plant,
  PlantWithRelations,
} from "@/types/models";

interface PlantDetailProps {
  data: PlantWithRelations;
}

type CareGuideCard = {
  key: string;
  title: string;
  body: string;
  icon: string;
  iconFamily?: "MaterialIcons";
  tone: "light" | "dark";
  tileColor?: string;
};

type ActivityCard = {
  id: string;
  title: string;
  body: string;
  condition: CareLogCondition | null;
  stampPrimary: string;
  stampSecondary: string;
  logType: CareLogType;
  icon: string;
  iconFamily?: "MaterialIcons";
};

function getPrimaryPhoto(data: PlantWithRelations) {
  return (
    data.photos.find((photo) => photo.isPrimary === 1) ?? data.photos[0] ?? null
  );
}

function getPlantStatus(plant: Plant) {
  if (!plant.nextWaterDueAt) {
    return "Healthy";
  }

  return new Date(plant.nextWaterDueAt).getTime() <= Date.now()
    ? "Needs Attention"
    : "Healthy";
}

function getFamilyLabel(speciesName: string) {
  const normalized = speciesName.toLowerCase();

  if (
    normalized.includes("monstera") ||
    normalized.includes("philodendron") ||
    normalized.includes("spathiphyllum") ||
    normalized.includes("pothos")
  ) {
    return "AROID FAMILY";
  }

  if (normalized.includes("ficus")) {
    return "MORACEAE";
  }

  if (normalized.includes("sansevieria") || normalized.includes("dracaena")) {
    return "ASPARAGACEAE";
  }

  return speciesName.toUpperCase();
}

function getEditorialSubtitle(plant: Plant) {
  return (
    plant.nickname?.trim() ??
    plant.location?.trim() ??
    plant.speciesName
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ")
  );
}

function formatStamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatYear(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
  }).format(new Date(value));
}

function getLogHeading(logType: CareLogType) {
  switch (logType) {
    case "water":
      return "Full Soak &\nFertilize";
    case "mist":
      return "Humidity\nRefresh";
    case "feed":
      return "Feed\nSession";
    case "repot":
      return "Repot &\nRefresh";
    case "prune":
      return "Propagation\nPruning";
    case "inspect":
      return "Routine\nInspection";
    case "pest":
      return "Pest\nInspection";
    case "note":
    default:
      return "Growth\nObservation";
  }
}

function getLogBody(logType: CareLogType, notes?: string | null) {
  const parsedNote = parseStructuredCareLogNote(notes);

  if (parsedNote.body) {
    return parsedNote.body;
  }

  switch (logType) {
    case "water":
      return "Used organic liquid fertilizer at half-strength. Noticed fresh growth unfurling near the stem.";
    case "mist":
      return "Boosted ambient moisture and refreshed the upper leaves.";
    case "feed":
      return "Fed to support steady growth and richer foliage tone.";
    case "repot":
      return "Repotted into fresh soil and refreshed the root zone to support steadier growth.";
    case "prune":
      return "Removed two older leaves for propagation. Nodes were placed in distilled water for root development.";
    case "inspect":
      return "Completed a close foliage and stem inspection to track growth and spot early issues.";
    case "pest":
      return "Cleaned leaves with neem oil. No signs of thrips or spider mites detected during routine check.";
    case "note":
    default:
      return "Captured a fresh growth note for this specimen.";
  }
}

function formatConditionLabel(condition: CareLogCondition) {
  return condition;
}

function getLogIcon(logType: CareLogType) {
  switch (logType) {
    case "water":
      return "water-drop";
    case "mist":
      return "opacity";
    case "feed":
      return "leaf";
    case "repot":
      return "yard";
    case "prune":
      return "content-cut";
    case "inspect":
      return "search";
    case "pest":
      return "filter-center-focus";
    case "note":
    default:
      return "event-note";
  }
}

function getLogIconFamily(_logType: CareLogType): "MaterialIcons" {
  return "MaterialIcons";
}

function buildCareGuide(plant: Plant): CareGuideCard[] {
  const defaults = buildCareDefaults({
    speciesName: plant.speciesName,
    lightCondition: "indirect",
  });

  return [
    {
      key: "light",
      title: "Editorial Light",
      body: defaults.lightSummary,
      icon: "wb-sunny",
      iconFamily: "MaterialIcons",
      tone: "light",
      tileColor: "#fde5dd",
    },
    {
      key: "water",
      title: "Hydration Rhythm",
      body: `${defaults.careProfileHint} Begin near every ${plant.wateringIntervalDays} days, then refine gently from the journal.`,
      icon: "opacity",
      iconFamily: "MaterialIcons",
      tone: "dark",
      tileColor: "#3a5647",
    },
    {
      key: "humidity",
      title: "Steady Conditions",
      body: "Consistency matters more than intervention. Let light, moisture, and routine settle into a calm pattern.",
      icon: "air",
      iconFamily: "MaterialIcons",
      tone: "light",
      tileColor: "#e7e4de",
    },
  ];
}

function buildRecentActivity(data: PlantWithRelations): ActivityCard[] {
  return [...data.logs]
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt))
    .slice(0, 3)
    .map((log) => ({
      id: log.id,
      title: getLogHeading(log.logType),
      body: getLogBody(log.logType, log.notes),
      condition: log.currentCondition ?? null,
      stampPrimary:
        formatStamp(log.loggedAt).toUpperCase() ===
        formatStamp(new Date().toISOString()).toUpperCase()
          ? "TODAY,"
          : `${formatStamp(log.loggedAt).toUpperCase()},`,
      stampSecondary:
        formatStamp(log.loggedAt).toUpperCase() ===
        formatStamp(new Date().toISOString()).toUpperCase()
          ? formatTime(log.loggedAt).toUpperCase()
          : formatYear(log.loggedAt),
      logType: log.logType,
      icon: getLogIcon(log.logType),
      iconFamily: getLogIconFamily(log.logType),
    }));
}

function getActivityBadgeStyle(
  logType: CareLogType,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (logType) {
    case "water":
      return {
        backgroundColor: colors.primaryFixed,
        iconColor: colors.primary,
      };
    case "pest":
      return {
        backgroundColor: "#dae7c9",
        iconColor: "#2a3521",
      };
    case "inspect":
      return {
        backgroundColor: "#dae7c9",
        iconColor: "#2a3521",
      };
    case "repot":
      return {
        backgroundColor: colors.secondaryFixed,
        iconColor: colors.secondary,
      };
    case "prune":
      return {
        backgroundColor: colors.surfaceContainerHigh,
        iconColor: colors.onSurfaceVariant,
      };
    case "mist":
    case "feed":
    case "note":
    default:
      return {
        backgroundColor: colors.surfaceContainerHigh,
        iconColor: colors.onSurfaceVariant,
      };
  }
}

function getActivityVisualType(
  item: Pick<ActivityCard, "title" | "logType">,
): CareLogType {
  if (item.title === "Full Soak &\nFertilize") {
    return "water";
  }

  return item.logType;
}

export function PlantDetail({ data }: PlantDetailProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const addPlantProgressPhoto = useAddPlantProgressPhoto(data.plant.id);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [mediaSheetVisible, setMediaSheetVisible] = useState(false);
  const mediaSheetOpacity = useRef(new Animated.Value(0)).current;
  const mediaSheetTranslateY = useRef(new Animated.Value(24)).current;
  const primaryPhoto = getPrimaryPhoto(data);
  const status = getPlantStatus(data.plant);
  const careGuide = buildCareGuide(data.plant);
  const recentActivity = buildRecentActivity(data);
  const growthPhotos = data.photos.filter(
    (photo) => photo.localUri || photo.remoteUrl,
  );

  while (growthPhotos.length < 3 && primaryPhoto) {
    growthPhotos.push(primaryPhoto);
  }

  useEffect(() => {
    if (!mediaSheetVisible) {
      mediaSheetOpacity.setValue(0);
      mediaSheetTranslateY.setValue(24);
      return;
    }

    mediaSheetOpacity.setValue(0);
    mediaSheetTranslateY.setValue(24);
    Animated.parallel([
      Animated.timing(mediaSheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(mediaSheetTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [mediaSheetOpacity, mediaSheetTranslateY, mediaSheetVisible]);

  const applyPhotoUpdate = async (photoUri: string) => {
    setIsUploadingPhoto(true);

    try {
      await addPlantProgressPhoto.mutateAsync(photoUri);
      snackbar.success("Progress photo saved successfully.");
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to add photo",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddPhoto = () => {
    setMediaSheetVisible(true);
  };

  const handleCapturePhoto = async () => {
    setMediaSheetVisible(false);

    try {
      const asset = await capturePlantImage();
      if (!asset) {
        return;
      }

      await applyPhotoUpdate(asset.uri);
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to open camera",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const handlePickPhoto = async () => {
    setMediaSheetVisible(false);

    try {
      const asset = await pickPlantImage();
      if (!asset) {
        return;
      }

      await applyPhotoUpdate(asset.uri);
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to open photo library",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        animationType="fade"
        transparent
        visible={mediaSheetVisible}
        onRequestClose={() => setMediaSheetVisible(false)}
      >
        <View style={styles.mediaSheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMediaSheetVisible(false)}
          />
          <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill}>
            <View
              style={[
                styles.mediaSheetOverlayTint,
                { backgroundColor: colors.backdrop },
              ]}
            />
          </BlurView>
          <Animated.View
            style={[
              styles.mediaSheet,
              shadowWithColor(shadowScale.floatingSheet, colors.backdrop),
              {
                backgroundColor: colors.surfaceContainerLowest,
                paddingBottom: Math.max(20, insets.bottom + 8),
                borderColor: "rgba(255, 255, 255, 0.72)",
                opacity: mediaSheetOpacity,
                transform: [{ translateY: mediaSheetTranslateY }],
              },
            ]}
          >
            <View
              style={[
                styles.mediaSheetHandle,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            />

            <View style={styles.mediaSheetHeader}>
              <Text style={[styles.mediaSheetTitle, { color: colors.primary }]}>
                Add Progress Photo
              </Text>
              <Text
                style={[
                  styles.mediaSheetBody,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Capture a fresh milestone or choose one from your library.
              </Text>
            </View>

            <View style={styles.mediaSheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleCapturePhoto}
                style={({ pressed }) => [
                  styles.mediaActionCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.surfaceContainerHigh,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.992 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.mediaActionIconTile,
                    { backgroundColor: colors.secondaryContainer },
                  ]}
                >
                  <Icon
                    family="MaterialIcons"
                    name="photo-camera"
                    size={22}
                    color={colors.secondary}
                  />
                </View>
                <Text
                  style={[styles.mediaActionTitle, { color: colors.onSurface }]}
                >
                  Take Photo
                </Text>
                <Text
                  style={[
                    styles.mediaActionBody,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Open the camera and capture today&apos;s growth.
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handlePickPhoto}
                style={({ pressed }) => [
                  styles.mediaActionCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.surfaceContainerHigh,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.992 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.mediaActionIconTile,
                    { backgroundColor: colors.primaryFixed },
                  ]}
                >
                  <Icon
                    family="MaterialIcons"
                    name="photo-library"
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.mediaActionTitle, { color: colors.onSurface }]}
                >
                  Photo Library
                </Text>
                <Text
                  style={[
                    styles.mediaActionBody,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Choose an existing image from your camera roll.
                </Text>
              </Pressable>
            </View>

            <SecondaryButton
              label="Cancel"
              fullWidth
              variant="surface"
              onPress={() => setMediaSheetVisible(false)}
            />
          </Animated.View>
        </View>
      </Modal>

      <View style={styles.heroWrap}>
        {primaryPhoto?.localUri || primaryPhoto?.remoteUrl ? (
          <Image
            source={{
              uri: primaryPhoto.localUri ?? primaryPhoto.remoteUrl ?? undefined,
            }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.heroFallback,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Icon name="sprout" size={52} color={colors.primary} />
          </View>
        )}

        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <View
            style={[
              styles.statusIconWrap,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Icon
              name={status === "Healthy" ? "leaf" : "water-alert"}
              size={13}
              color={colors.primary}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text
              style={[styles.statusEyebrow, { color: colors.onSurfaceVariant }]}
            >
              STATUS
            </Text>
            <Text style={[styles.statusValue, { color: colors.onSurface }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.identity}>
        <View
          style={[
            styles.familyChip,
            { backgroundColor: colors.secondaryFixed },
          ]}
        >
          <View
            style={[
              styles.familyChipDot,
              { backgroundColor: colors.secondary },
            ]}
          />
          <Text style={[styles.familyChipText, { color: colors.secondary }]}>
            {getFamilyLabel(data.plant.speciesName)}
          </Text>
        </View>

        <Text style={[styles.name, { color: colors.primary }]}>
          {data.plant.name}
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {getEditorialSubtitle(data.plant)}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Water Now"
          icon="water-drop"
          iconFamily="MaterialIcons"
          onPress={() => router.push(`/care-log/${data.plant.id}` as const)}
        />

        <SecondaryButton
          label="Add Log"
          icon="plus"
          fullWidth
          variant="surface"
          onPress={() => router.push(`/care-log/${data.plant.id}` as const)}
        />
      </View>

      <PlantDetailHealthInsight plantId={data.plant.id} data={data} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Care Guide
          </Text>
          <View
            style={[
              styles.sectionRule,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
        </View>

        <View style={styles.guideStack}>
          {careGuide.map((card) => {
            const darkCard = card.tone === "dark";

            return (
              <View
                key={card.key}
                style={[
                  styles.guideCard,
                  {
                    backgroundColor: darkCard
                      ? colors.primary
                      : card.key === "humidity"
                        ? "#f1eee8"
                        : colors.surfaceContainerLow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.guideIconTile,
                    {
                      backgroundColor:
                        card.tileColor ??
                        (darkCard
                          ? "rgba(255,255,255,0.12)"
                          : colors.secondaryContainer),
                    },
                  ]}
                >
                  <Icon
                    family={card.iconFamily}
                    name={card.icon}
                    size={20}
                    color={
                      darkCard
                        ? "#d9ead8"
                        : card.key === "humidity"
                          ? "#5c625d"
                          : colors.secondary
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.guideTitle,
                    {
                      color: darkCard ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.guideBody,
                    {
                      color: darkCard ? "#a9cfb9" : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {card.body}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Recent Activity
          </Text>
          <Text style={[styles.sectionLink, { color: colors.secondary }]}>
            VIEW ALL
          </Text>
        </View>

        <View style={styles.activityStack}>
          {recentActivity.length ? (
            recentActivity.map((item, index) => {
              const visualType = getActivityVisualType(item);
              const badgeStyle = getActivityBadgeStyle(visualType, colors);

              return (
                <View key={item.id} style={styles.activityRow}>
                  <View style={styles.activityRail}>
                    <View
                      style={[
                        styles.activityIconTile,
                        { backgroundColor: badgeStyle.backgroundColor },
                      ]}
                    >
                      <Icon
                        family={getLogIconFamily(visualType)}
                        name={getLogIcon(visualType)}
                        size={18}
                        color={badgeStyle.iconColor}
                      />
                    </View>
                    {index < recentActivity.length - 1 ? (
                      <View
                        style={[
                          styles.activityRailLine,
                          { backgroundColor: colors.surfaceContainerHigh },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.activityContent}>
                    <Text
                      style={[
                        styles.activityStamp,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {`${item.stampPrimary} ${item.stampSecondary}`}
                    </Text>
                    <Text
                      style={[styles.activityTitle, { color: colors.primary }]}
                    >
                      {item.title.replace("\n", " ")}
                    </Text>
                    {item.condition ? (
                      <View
                        style={[
                          styles.activityConditionPill,
                          { backgroundColor: colors.surfaceContainerHigh },
                        ]}
                      >
                        <Text
                          style={[
                            styles.activityConditionLabel,
                            { color: colors.onSurface },
                          ]}
                        >
                          {formatConditionLabel(item.condition)}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.activityBody,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {item.body}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View
              style={[
                styles.activityEmptyCard,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Text
                style={[styles.activityEmptyTitle, { color: colors.onSurface }]}
              >
                No care entries yet
              </Text>
              <Text
                style={[
                  styles.activityEmptyBody,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                This journal will begin to read like a real history once you log
                watering, observations, and care rituals for this specimen.
              </Text>
            </View>
          )}

          {recentActivity.length > 0 && recentActivity.length < 3 ? (
            <View
              style={[
                styles.activitySparseCard,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Text
                style={[
                  styles.activitySparseTitle,
                  { color: colors.onSurface },
                ]}
              >
                A young journal, honestly kept
              </Text>
              <Text
                style={[
                  styles.activitySparseBody,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Only saved care logs appear here. Add a few more entries and
                this timeline will fill in naturally.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Growth
          </Text>
          <Text style={[styles.sectionLink, { color: colors.secondary }]}>
            TIMELINE
          </Text>
        </View>

        <View style={styles.growthGrid}>
          {growthPhotos.slice(0, 3).map((photo, index) => (
            <View key={`${photo.id}-${index}`} style={styles.growthPhotoWrap}>
              <Image
                source={{ uri: photo.localUri ?? photo.remoteUrl ?? undefined }}
                style={styles.growthPhoto}
                contentFit="cover"
              />
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={handleAddPhoto}
            disabled={isUploadingPhoto || addPlantProgressPhoto.isPending}
            style={({ pressed }) => [
              styles.addPhotoTile,
              {
                backgroundColor: colors.surfaceContainerLow,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="add-a-photo"
              size={30}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={[styles.addPhotoLabel, { color: colors.onSurfaceVariant }]}
            >
              {isUploadingPhoto || addPlantProgressPhoto.isPending
                ? "ADDING PHOTO"
                : "ADD PHOTO"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 28,
  },
  heroWrap: {
    height: 356,
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    position: "absolute",
    left: 14,
    bottom: 14,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadowScale.elevatedCard,
  },
  statusIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: {
    gap: 0,
  },
  statusEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  statusValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  identity: {
    gap: 8,
  },
  familyChip: {
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  familyChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  familyChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    borderRadius: 999,
  },
  sectionLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    marginLeft: "auto",
  },
  guideStack: {
    gap: 14,
  },
  guideCard: {
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 26,
    minHeight: 178,
    justifyContent: "flex-start",
    gap: 12,
  },
  guideIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  guideTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 19,
    lineHeight: 26,
  },
  guideBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 22,
    maxWidth: 256,
    marginTop: -4,
  },
  activityStack: {
    gap: 16,
  },
  activityRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  activityRail: {
    width: 54,
    alignItems: "center",
  },
  activityIconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activityRailLine: {
    width: 1,
    minHeight: 86,
    marginTop: 10,
  },
  activityContent: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  activityStamp: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
  },
  activityTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 25,
  },
  activityBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 22,
    maxWidth: 250,
  },
  activityConditionPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  activityConditionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  activityEmptyCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
  },
  activityEmptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  activityEmptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  activitySparseCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 6,
  },
  activitySparseTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  activitySparseBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  growthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  growthPhotoWrap: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  growthPhoto: {
    width: "100%",
    height: "100%",
  },
  addPhotoTile: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ddd7cd",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addPhotoLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  mediaSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  mediaSheetOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  mediaSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
    borderWidth: 1,
  },
  mediaSheetHandle: {
    width: 64,
    height: 6,
    borderRadius: 999,
    alignSelf: "center",
  },
  mediaSheetHeader: {
    gap: 6,
  },
  mediaSheetTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  mediaSheetBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  mediaSheetActions: {
    gap: 12,
  },
  mediaActionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
    ...shadowScale.subtleSurface,
  },
  mediaActionIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaActionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  mediaActionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
});

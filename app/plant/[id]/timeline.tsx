import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getFloatingActionBottomOffset } from "@/components/navigation/tabBarMetrics";
import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import { useAddPlantProgressPhoto } from "@/features/plants/hooks/useAddPlantProgressPhoto";
import { usePlant } from "@/features/plants/hooks/usePlant";
import {
  capturePlantImage,
  pickPlantImage,
} from "@/features/plants/services/photoService";
import { useAlert } from "@/hooks/useAlert";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { useSnackbar } from "@/hooks/useSnackbar";
import type { CareLog, Photo, PlantWithRelations } from "@/types/models";

type TimelineMoment = {
  id: string;
  imageUri: string;
  timestamp: string;
  dateChip: string;
  headline: string;
  body: string;
};

function resolvePhotoUri(photo: Photo | undefined) {
  if (!photo) {
    return null;
  }
  if (photo.remoteUrl) {
    return photo.remoteUrl;
  }
  if (photo.localUri) {
    return photo.localUri;
  }
  return null;
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

function buildTimelineTitle(log: CareLog | null, index: number) {
  if (!log) {
    if (index === 0) {
      return "The latest chapter";
    }
    if (index === 1) {
      return "A new support system";
    }
    return "Arrival from the nursery";
  }

  switch (log.logType) {
    case "water":
      return "Hydration check-in";
    case "mist":
      return "Humidity window";
    case "feed":
      return "Nourishment day";
    case "repot":
      return "Fresh soil reset";
    case "prune":
      return "Shaping and balance";
    case "inspect":
      return "Close observation";
    case "pest":
      return "Recovery update";
    case "note":
    default:
      return "A growth note";
  }
}

function buildTimelineBody(input: {
  log: CareLog | null;
  plantName: string;
  speciesName: string;
  plantNotes?: string | null;
}) {
  const parsedNote = parseStructuredCareLogNote(input.log?.notes);
  if (parsedNote.body) {
    return parsedNote.body;
  }

  if (input.log) {
    switch (input.log.logType) {
      case "water":
        return `${input.plantName} was watered deeply and left to settle into its regular rhythm.`;
      case "mist":
        return `${input.plantName} was lightly misted to keep foliage fresh and humidity stable.`;
      case "feed":
        return `${input.plantName} was fed to support stronger and more consistent growth.`;
      case "repot":
        return `${input.plantName} moved into a roomier pot with fresh mix to support root expansion.`;
      case "prune":
        return `${input.plantName} was pruned with care to shape growth and redirect energy.`;
      case "inspect":
        return `${input.plantName} was inspected for leaf health, stem condition, and overall vigor.`;
      case "pest":
        return `${input.plantName} received extra treatment and close follow-up monitoring.`;
      case "note":
      default:
        return `A new observation was recorded for ${input.plantName} at this stage.`;
    }
  }

  if (input.plantNotes?.trim()) {
    return input.plantNotes.trim();
  }

  return `${input.plantName} continues its ${input.speciesName.toLowerCase()} journey, one frame at a time.`;
}

function findClosestLog(logs: CareLog[], timestamp: string) {
  const targetTime = new Date(timestamp).getTime();
  const maxDistance = 1000 * 60 * 60 * 24 * 21;
  let bestMatch: CareLog | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const log of logs) {
    const distance = Math.abs(new Date(log.loggedAt).getTime() - targetTime);
    if (distance <= maxDistance && distance < bestDistance) {
      bestMatch = log;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

function buildTimelineMoments(data: PlantWithRelations | null | undefined) {
  if (!data) {
    return [] as TimelineMoment[];
  }

  const logs = [...data.logs].sort((left, right) =>
    right.loggedAt.localeCompare(left.loggedAt),
  );

  return data.photos
    .map((photo) => {
      const imageUri = resolvePhotoUri(photo);
      const timestamp = photo.takenAt ?? photo.updatedAt ?? photo.createdAt;

      if (!imageUri) {
        return null;
      }

      return { photo, imageUri, timestamp };
    })
    .filter(
      (
        item,
      ): item is {
        photo: Photo;
        imageUri: string;
        timestamp: string;
      } => item !== null,
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .map((item, index) => {
      const matchedLog = findClosestLog(logs, item.timestamp);

      return {
        id: item.photo.id,
        imageUri: item.imageUri,
        timestamp: item.timestamp,
        dateChip: formatTimelineDate(item.timestamp),
        headline: buildTimelineTitle(matchedLog, index),
        body: buildTimelineBody({
          log: matchedLog,
          plantName: data.plant.name,
          speciesName: data.plant.speciesName,
          plantNotes: data.plant.notes,
        }),
      };
    });
}

export default function GrowthTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const { onRefresh, refreshing } = usePullToRefreshSync();

  const plantQuery = usePlant(id ?? "");
  const addPlantProgressPhoto = useAddPlantProgressPhoto(id ?? "");
  const [mediaSheetVisible, setMediaSheetVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fabBottomOffset =
    getFloatingActionBottomOffset(insets.bottom) - insets.bottom;

  const timelineMoments = useMemo(
    () => buildTimelineMoments(plantQuery.data ?? null),
    [plantQuery.data],
  );

  const plant = plantQuery.data?.plant ?? null;

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
            paddingBottom: fabBottomOffset + 84,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.primary }]}>
            Growth Progress
          </Text>
        </View>

        <View style={styles.pageIntro}>
          <Text style={[styles.pageEyebrow, { color: colors.secondary }]}>
            WITNESS THE JOURNEY
          </Text>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {plant?.name ?? "Untitled Plant"}
          </Text>
        </View>

        {timelineMoments.length > 0 ? (
          <>
            <View
              style={[
                styles.filmstripSection,
                { marginHorizontal: -spacing.lg },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.filmstripRow,
                  { paddingHorizontal: spacing.lg },
                ]}
              >
                {timelineMoments.map((moment) => (
                  <View key={moment.id} style={styles.filmstripCard}>
                    <Image
                      source={{ uri: moment.imageUri }}
                      style={styles.filmstripImage}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timelineList}>
              {timelineMoments.map((moment) => (
                <View key={moment.id} style={styles.timelineEntry}>
                  <View
                    style={[
                      styles.dateChip,
                      { backgroundColor: colors.surfaceContainerHigh + 85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipLabel,
                        { color: colors.secondaryContainer },
                      ]}
                    >
                      {moment.dateChip}
                    </Text>
                  </View>

                  <Text
                    style={[styles.entryTitle, { color: colors.onSurface }]}
                  >
                    {moment.headline}
                  </Text>

                  <View
                    style={[
                      styles.entryImageWrap,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    <Image
                      source={{ uri: moment.imageUri }}
                      style={styles.entryImage}
                      contentFit="cover"
                    />
                  </View>

                  <Text
                    style={[
                      styles.entryBody,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {moment.body}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : plantQuery.isLoading ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>
              Loading timeline
            </Text>
            <Text
              style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}
            >
              Preparing the latest growth moments.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>
              No timeline moments yet
            </Text>
            <Text
              style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}
            >
              Add your first progress photo to begin this plant&apos;s story.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={mediaSheetVisible}
        onRequestClose={() => setMediaSheetVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
            onPress={() => setMediaSheetVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surfaceContainerLowest,
                paddingBottom: Math.max(insets.bottom + spacing.md, spacing.lg),
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Add a new frame
            </Text>
            <Text
              style={[styles.modalBody, { color: colors.onSurfaceVariant }]}
            >
              Capture a fresh moment or choose one from your library.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={handleCapturePhoto}
              style={[
                styles.modalAction,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Icon name="camera-outline" size={20} color={colors.primary} />
              <Text
                style={[styles.modalActionLabel, { color: colors.onSurface }]}
              >
                Take Photo
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handlePickPhoto}
              style={[
                styles.modalAction,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Icon name="image-outline" size={20} color={colors.primary} />
              <Text
                style={[styles.modalActionLabel, { color: colors.onSurface }]}
              >
                Choose From Library
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMediaSheetVisible(false)}
              style={styles.modalCancel}
            >
              <Text
                style={[
                  styles.modalCancelLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={[styles.footerButton, { bottom: fabBottomOffset }]}>
        <PrimaryButton
          compact
          onPress={() => setMediaSheetVisible(true)}
          icon="camera-outline"
          label="Add Photo"
          loading={isUploadingPhoto}
          disabled={isUploadingPhoto}
        />
      </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  pageIntro: {
    gap: 4,
  },
  pageEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2.8,
  },
  pageTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 38,
    lineHeight: 46,
  },
  filmstripSection: {
    marginTop: -2,
  },
  filmstripRow: {
    gap: 12,
    paddingBottom: 2,
  },
  filmstripCard: {
    width: 128,
    height: 176,
    borderRadius: 8,
    overflow: "hidden",
  },
  filmstripImage: {
    width: "100%",
    height: "100%",
  },
  timelineList: {
    gap: 40,
  },
  timelineEntry: {
    gap: 14,
  },
  dateChip: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dateChipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  entryTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 38,
    lineHeight: 46,
  },
  entryImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  entryImage: {
    width: "100%",
    aspectRatio: 4 / 5,
  },
  entryBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 18,
    lineHeight: 30,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 30,
    lineHeight: 36,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  footerButton: {
    position: "absolute",
    right: 18,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  modalBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
  },
  modalAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalActionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  modalCancel: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCancelLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
});

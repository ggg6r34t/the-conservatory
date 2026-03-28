import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
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
import { AddProgressPhotoSheet } from "@/features/plants/components/AddProgressPhotoSheet";
import { useAddPlantProgressPhoto } from "@/features/plants/hooks/useAddPlantProgressPhoto";
import { usePlant } from "@/features/plants/hooks/usePlant";
import { buildGrowthTimeline } from "@/features/plants/services/growthTimelineService";
import {
  capturePlantImage,
  pickPlantImage,
  type PlantImageAsset,
} from "@/features/plants/services/photoService";
import { useAlert } from "@/hooks/useAlert";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { useSnackbar } from "@/hooks/useSnackbar";

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
    () => buildGrowthTimeline(plantQuery.data ?? null),
    [plantQuery.data],
  );

  const plant = plantQuery.data?.plant ?? null;

  const applyPhotoUpdate = async (photo: PlantImageAsset) => {
    setIsUploadingPhoto(true);

    try {
      await addPlantProgressPhoto.mutateAsync(photo);
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
      await applyPhotoUpdate(asset);
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
      await applyPhotoUpdate(asset);
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
        <View style={{ gap: 20 }}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={10}
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Icon
                  family="MaterialCommunityIcons"
                  name="arrow-left"
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
              <Text style={[styles.topBarTitle, { color: colors.primary }]}>
                Growth Progress
              </Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>
              WITNESS THE JOURNEY
            </Text>
            <Text style={[styles.heroTitle, { color: colors.primary }]}>
              {plant?.name ?? "Untitled Plant"}
            </Text>
          </View>
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
                      {moment.dateLabel}
                    </Text>
                  </View>

                  {moment.associatedLog ? (
                    <Text
                      style={[styles.entryTitle, { color: colors.onSurface }]}
                    >
                      {moment.associatedLog.title}
                    </Text>
                  ) : null}

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

                  {moment.caption || moment.associatedLog?.body ? (
                    <Text
                      style={[
                        styles.entryBody,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {moment.caption ?? moment.associatedLog?.body}
                    </Text>
                  ) : null}
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

      <AddProgressPhotoSheet
        visible={mediaSheetVisible}
        onClose={() => setMediaSheetVisible(false)}
        onCapture={handleCapturePhoto}
        onPickFromLibrary={handlePickPhoto}
      />

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
  hero: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 50,
  },
  filmstripSection: {
    marginTop: -2,
  },
  filmstripRow: {
    gap: 12,
    paddingBottom: 2,
  },
  filmstripCard: {
    width: 140,
    height: 188,
    borderRadius: 26,
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
    borderRadius: 32,
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
});

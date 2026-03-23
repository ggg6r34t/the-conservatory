import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/design-system/useTheme";
import { CareLogForm } from "@/features/care-logs/components/CareLogForm";
import { usePlant } from "@/features/plants/hooks/usePlant";

export default function CareLogRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const plantQuery = usePlant(id ?? "");
  const plant = plantQuery.data?.plant;
  const primaryPhoto = plantQuery.data?.photos.find(
    (photo) => photo.isPrimary === 1,
  );
  const plantImageUri =
    primaryPhoto?.localUri ?? primaryPhoto?.remoteUrl ?? undefined;
  const translateY = useRef(new Animated.Value(0)).current;

  const closeSheet = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 900,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  }, [router, translateY]);

  const resetSheetPosition = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 18,
    }).start();
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1) {
            closeSheet();
            return;
          }

          resetSheetPosition();
        },
        onPanResponderTerminate: resetSheetPosition,
      }),
    [closeSheet, resetSheetPosition, translateY],
  );

  return (
    <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            transform: [{ translateY }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(spacing.xl, insets.bottom + 24) }}
        >
          <View style={styles.dragRegion} {...panResponder.panHandlers}>
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            />
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>
              Log Care
            </Text>

            {plant ? (
              <View
                style={[
                  styles.plantCard,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                {plantImageUri ? (
                  <Image
                    source={{ uri: plantImageUri }}
                    style={styles.plantImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.plantImage,
                      { backgroundColor: colors.surfaceContainerHigh },
                    ]}
                  />
                )}

                <View style={styles.plantCopy}>
                  <Text style={[styles.plantName, { color: colors.onSurface }]}>
                    {plant.name}
                  </Text>
                  <Text
                    style={[
                      styles.plantLocation,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {(plant.location ?? "Unplaced").toUpperCase()}
                  </Text>
                </View>

                <Text style={[styles.changeText, { color: colors.primary }]}>
                  change
                </Text>
              </View>
            ) : (
              <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                Capture today&apos;s ritual for this specimen.
              </Text>
            )}

            <CareLogForm plantId={id ?? ""} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    minHeight: "88%",
    maxHeight: "88%",
    overflow: "hidden",
  },
  content: {
    gap: 28,
  },
  dragRegion: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    paddingBottom: 12,
  },
  handle: {
    width: 74,
    height: 8,
    borderRadius: 999,
    alignSelf: "center",
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 40,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  plantCard: {
    borderRadius: 28,
    minHeight: 112,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  plantImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
  },
  plantCopy: {
    flex: 1,
    gap: 6,
  },
  plantName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  plantLocation: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
  },
  changeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textDecorationLine: "underline",
    textDecorationColor: "#c5ebd4",
  },
});

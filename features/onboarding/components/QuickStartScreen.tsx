import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { withAlpha } from "@/features/theme/utils/withAlpha";
import { SpeciesSuggestionBanner } from "@/features/ai/components/SpeciesSuggestionBanner";
import { useSpeciesSuggestion } from "@/features/ai/hooks/useSpeciesSuggestion";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import {
  markOnboardingAction,
  markOnboardingCompletedAt,
  markQuickStartViewed,
} from "@/features/onboarding/services/onboardingDebugStorage";
import { completeOnboarding } from "@/features/onboarding/services/onboardingStorage";
import {
  capturePlantImage,
  pickPlantImage,
} from "@/features/plants/services/photoService";
import { setPlantDraft } from "@/features/plants/services/plantDraftStorage";
import { trackEvent } from "@/services/analytics/analyticsService";
import { shadowScale } from "@/styles/shadows";

type LightCondition = "low" | "indirect" | "direct";

function buildDraftNotes(lightCondition: LightCondition) {
  if (lightCondition === "low") {
    return "Prefers low light conditions.";
  }

  if (lightCondition === "direct") {
    return "Thrives in direct light conditions.";
  }

  return "Performs best in bright indirect light.";
}

export default function QuickStartScreen({
  debugPreview = false,
}: {
  debugPreview?: boolean;
}) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const lightOptions = [
    {
      key: "low" as const,
      label: "LOW",
      icon: "cloud",
      iconColor: colors.onSurface,
      backgroundColor: colors.surfaceContainerHigh,
    },
    {
      key: "indirect" as const,
      label: "INDIRECT",
      icon: "wb-cloudy",
      iconColor: colors.onPrimary,
      backgroundColor: colors.primary,
    },
    {
      key: "direct" as const,
      label: "DIRECT",
      icon: "wb-sunny",
      iconColor: colors.secondary,
      backgroundColor: colors.secondaryFixed,
    },
  ];
  const [speciesName, setSpeciesName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [lightCondition, setLightCondition] =
    useState<LightCondition>("indirect");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;
  const [dismissedSuggestionUri, setDismissedSuggestionUri] = useState<
    string | null
  >(null);
  const { isPremium } = useSubscription();
  const speciesSuggestionQuery = useSpeciesSuggestion({
    imageUri: photoUri,
    isPremium,
  });
  const visibleSuggestion =
    photoUri && dismissedSuggestionUri !== photoUri
      ? speciesSuggestionQuery.data
      : null;

  useEffect(() => {
    void markQuickStartViewed();
  }, []);

  useEffect(() => {
    if (!photoPickerVisible) {
      sheetOpacity.setValue(0);
      sheetTranslateY.setValue(24);
      return;
    }

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [photoPickerVisible, sheetOpacity, sheetTranslateY]);

  const applyPhotoAsset = async (
    asset: Awaited<ReturnType<typeof pickPlantImage>>,
  ) => {
    if (!asset) return;
    setPhotoUri(asset.uri);
    setDismissedSuggestionUri(null);
    await markOnboardingAction("quick_start_photo_added");
    trackEvent("onboarding_quick_start_photo_added");
  };

  const handleCapturePhoto = async () => {
    setPhotoPickerVisible(false);
    try {
      await applyPhotoAsset(await capturePlantImage());
    } catch (error) {
      Alert.alert(
        "Unable to open camera",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const handlePickFromLibrary = async () => {
    setPhotoPickerVisible(false);
    try {
      await applyPhotoAsset(await pickPlantImage());
    } catch (error) {
      Alert.alert(
        "Unable to open photo library",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  const handleCreate = async () => {
    if (!speciesName.trim()) {
      Alert.alert(
        "Add a plant name",
        "Start with a scientific or common name.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await setPlantDraft({
        name: speciesName.trim(),
        speciesName: speciesName.trim(),
        notes: buildDraftNotes(lightCondition),
        photoUri,
      });
      await markOnboardingAction("quick_start_completed");
      await completeOnboarding();
      await markOnboardingCompletedAt();
      trackEvent("onboarding_quick_start_completed", {
        lightCondition,
        hasPhoto: Boolean(photoUri),
      });
      if (debugPreview) {
        router.replace("/debug/onboarding");
        return;
      }

      router.push({
        pathname: "/(auth)/signup",
        params: { redirectTo: "/plant/add" },
      });
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSubmitting(true);
      await markOnboardingAction("quick_start_skipped");
      await completeOnboarding();
      await markOnboardingCompletedAt();
      trackEvent("onboarding_quick_start_skipped");
      router.push(debugPreview ? "/debug/onboarding" : "/(auth)/signup");
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.surface }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: 80,
            },
          ]}
        >
          <View style={styles.heroSection}>
            <Image
              source={require("@/assets/images/bird-of-paradise.png")}
              style={styles.heroBackground}
              contentFit="cover"
              contentPosition="right center"
              accessibilityIgnoresInvertColors
            />

            <AppHeader
              title={"Add your first\nspecimen"}
              subtitle="Quick Start"
              showBackButton
            />

            <Text
              style={[styles.description, { color: colors.onSurfaceVariant }]}
            >
              Start with one plant so your garden opens with real data. You can
              add more details, photos, and care history after signup.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add your first plant photo"
              disabled={isSubmitting}
              onPress={() => setPhotoPickerVisible(true)}
              style={({ pressed }) => [
                styles.imagePicker,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.surfaceContainerHigh,
                  opacity: pressed ? 0.94 : 1,
                  transform: [{ scale: pressed ? 0.992 : 1 }],
                },
              ]}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : null}
              <View
                style={[
                  styles.captureBadge,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                <Icon
                  family="MaterialIcons"
                  name="add-a-photo"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.captureTitle, { color: colors.onSurface }]}>
                Tap to capture your plant
              </Text>
              <Text
                style={[styles.captureMeta, { color: colors.onSurfaceVariant }]}
              >
                JPEG or PNG, up to 10MB
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
              SCIENTIFIC OR COMMON NAME
            </Text>
            <View
              style={[
                styles.searchField,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: withAlpha(colors.outlineVariant, 0.35),
                },
              ]}
            >
              <Icon
                family="MaterialIcons"
                name="search"
                size={20}
                color={colors.onSurfaceVariant}
              />
              <TextInput
                accessibilityLabel="Scientific or common name"
                placeholder="e.g. Monstera Deliciosa"
                placeholderTextColor={colors.outlineVariant}
                value={speciesName}
                onChangeText={(value) => {
                  setSpeciesName(value);
                }}
                editable={!isSubmitting}
                style={[styles.input, { color: colors.onSurface }]}
              />
            </View>
          </View>

          {visibleSuggestion ? (
            <SpeciesSuggestionBanner
              suggestion={visibleSuggestion}
              onAccept={() => {
                setSpeciesName(visibleSuggestion.species);
              }}
              onDismiss={() => {
                setDismissedSuggestionUri(photoUri ?? null);
              }}
            />
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
              LIGHT CONDITION
            </Text>
            <View style={styles.lightOptions}>
              {lightOptions.map((option) => {
                const isActive = option.key === lightCondition;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    disabled={isSubmitting}
                    onPress={() => setLightCondition(option.key)}
                    style={({ pressed }) => [
                      styles.lightCardPressable,
                      {
                        opacity: pressed ? 0.94 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}
                  >
                    {isActive ? (
                      <View
                        style={[
                          styles.lightCard,
                          {
                            backgroundColor: colors.primary,
                            borderColor: withAlpha(colors.onPrimary, 0.7),
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.lightIconWrap,
                            {
                              backgroundColor: withAlpha(colors.onPrimary, 0.18),
                            },
                          ]}
                        >
                          <Icon
                            family="MaterialIcons"
                            name={option.icon}
                            size={28}
                            color={colors.surfaceBright}
                          />
                        </View>
                        <Text
                          style={[
                            styles.lightLabel,
                            { color: colors.surfaceBright },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.lightCard,
                          {
                            backgroundColor: colors.surfaceContainerLowest,
                            borderColor: withAlpha(colors.outlineVariant, 0.35),
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.lightIconWrap,
                            {
                              backgroundColor: option.backgroundColor,
                            },
                          ]}
                        >
                          <Icon
                            family="MaterialIcons"
                            name={option.icon}
                            size={28}
                            color={option.iconColor}
                          />
                        </View>
                        <Text
                          style={[
                            styles.lightLabel,
                            { color: colors.onSurface },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <PrimaryButton
              label="Create My First Plant"
              onPress={handleCreate}
              loading={isSubmitting}
              disabled={isSubmitting}
              icon="arrow-forward"
              iconFamily="MaterialIcons"
              iconPosition="trailing"
            />
            <Pressable
              accessibilityRole="button"
              onPress={handleSkip}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.skipAction,
                pressed && !isSubmitting && styles.skipActionPressed,
              ]}
            >
              <Text
                style={[
                  styles.skipText,
                  {
                    color: isSubmitting
                      ? colors.onSurfaceVariant
                      : colors.onSurface,
                  },
                ]}
              >
                Skip for now
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="none"
        transparent
        visible={photoPickerVisible}
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoPickerVisible(false)}
          />
          <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill}>
            <View
              style={[
                styles.pickerOverlayTint,
                { backgroundColor: colors.backdrop },
              ]}
            />
          </BlurView>
          <Animated.View
            style={[
              styles.pickerSheet,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: withAlpha(colors.surfaceContainerLowest, 0.72),
                paddingBottom: Math.max(20, insets.bottom + 8),
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View
              style={[
                styles.pickerHandle,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            />

            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.primary }]}>
                Specimen Portrait
              </Text>
              <Text
                style={[styles.pickerBody, { color: colors.onSurfaceVariant }]}
              >
                Start with a clear photo — it helps identify your plant and
                track how it grows over time.
              </Text>
            </View>

            <View style={styles.pickerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleCapturePhoto();
                }}
                style={({ pressed }) => [
                  styles.pickerActionCard,
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
                    styles.pickerActionIconTile,
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
                <View style={styles.pickerActionText}>
                  <Text
                    style={[
                      styles.pickerActionTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    Take Photo
                  </Text>
                  <Text
                    style={[
                      styles.pickerActionBody,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Photograph the specimen now.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handlePickFromLibrary();
                }}
                style={({ pressed }) => [
                  styles.pickerActionCard,
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
                    styles.pickerActionIconTile,
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
                <View style={styles.pickerActionText}>
                  <Text
                    style={[
                      styles.pickerActionTitle,
                      { color: colors.onSurface },
                    ]}
                  >
                    Photo Library
                  </Text>
                  <Text
                    style={[
                      styles.pickerActionBody,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Import an existing photo from your camera roll.
                  </Text>
                </View>
              </Pressable>
            </View>

            <SecondaryButton
              label="Cancel"
              fullWidth
              variant="surface"
              onPress={() => setPhotoPickerVisible(false)}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  heroSection: {
    position: "relative",
    overflow: "hidden",
    gap: 20,
    paddingBottom: 8,
  },
  heroBackground: {
    position: "absolute",
    top: 64,
    right: -84,
    width: 380,
    height: 420,
    opacity: 0.28,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 340,
  },
  imagePicker: {
    minHeight: 320,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 24,
    ...shadowScale.elevatedCard,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  captureBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  captureTitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  captureMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  searchField: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadowScale.subtleSurface,
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  lightOptions: {
    flexDirection: "row",
    gap: 12,
  },
  lightCardPressable: {
    flex: 1,
  },
  lightCard: {
    minHeight: 132,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderWidth: 1,
    ...shadowScale.elevatedCard,
  },
  lightIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  lightLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    gap: 18,
  },
  skipAction: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  skipActionPressed: {
    opacity: 0.72,
  },
  skipText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  pickerSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
    borderWidth: 1,
  },
  pickerHandle: {
    width: 64,
    height: 6,
    borderRadius: 999,
    alignSelf: "center",
  },
  pickerHeader: {
    gap: 6,
  },
  pickerTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  pickerBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  pickerActions: {
    gap: 12,
  },
  pickerActionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pickerActionIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickerActionText: {
    flex: 1,
    gap: 3,
  },
  pickerActionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  pickerActionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
});

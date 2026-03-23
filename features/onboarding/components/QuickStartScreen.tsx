import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import {
  markOnboardingAction,
  markOnboardingCompletedAt,
  markQuickStartViewed,
} from "@/features/onboarding/services/onboardingDebugStorage";
import { completeOnboarding } from "@/features/onboarding/services/onboardingStorage";
import { pickPlantImage } from "@/features/plants/services/photoService";
import { setPlantDraft } from "@/features/plants/services/plantDraftStorage";
import { trackEvent } from "@/services/analytics/analyticsService";

type LightCondition = "low" | "indirect" | "direct";

const LIGHT_OPTIONS: {
  key: LightCondition;
  label: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
}[] = [
  {
    key: "low",
    label: "LOW",
    icon: "cloud",
    iconColor: "#1b1c19",
    backgroundColor: "#eae8e3",
  },
  {
    key: "indirect",
    label: "INDIRECT",
    icon: "wb-cloudy",
    iconColor: "#ffffff",
    backgroundColor: "#163828",
  },
  {
    key: "direct",
    label: "DIRECT",
    icon: "wb-sunny",
    iconColor: "#94492e",
    backgroundColor: "#ffdbcf",
  },
];

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
  const { colors } = useTheme();
  const [speciesName, setSpeciesName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [lightCondition, setLightCondition] =
    useState<LightCondition>("indirect");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void markQuickStartViewed();
  }, []);

  const handlePickImage = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      const asset = await pickPlantImage();
      if (!asset) {
        return;
      }

      setPhotoUri(asset.uri);
      await markOnboardingAction("quick_start_photo_added");
      trackEvent("onboarding_quick_start_photo_added");
    } catch (error) {
      Alert.alert(
        "Unable to add plant photo",
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.heroStarVertical} pointerEvents="none" />
        <View style={styles.heroStarHorizontal} pointerEvents="none" />
        <Text style={[styles.brand, { color: colors.primary }]}>
          LEAF_RK Botanical
        </Text>

        <View style={styles.copyBlock}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            QUICK START
          </Text>
          <Text style={[styles.title, { color: colors.primary }]}>
            Add your first{"\n"}specimen
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your first plant photo"
          disabled={isSubmitting}
          onPress={handlePickImage}
          style={[
            styles.imagePicker,
            {
              backgroundColor: colors.surface,
              borderColor: "rgba(22, 56, 40, 0.42)",
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
          {!photoUri ? (
            <LinearGradient
              colors={["rgba(255,255,255,0.42)", "rgba(255,255,255,0.06)"]}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.82, y: 0.9 }}
              style={styles.imageGloss}
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

        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
            SCIENTIFIC OR COMMON NAME
          </Text>
          <View
            style={[
              styles.searchField,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="search"
              size={24}
              color="#9ea39b"
            />
            <TextInput
              accessibilityLabel="Scientific or common name"
              placeholder="e.g. Monstera Deliciosa"
              placeholderTextColor="#b5b9b2"
              value={speciesName}
              onChangeText={setSpeciesName}
              editable={!isSubmitting}
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
            LIGHT CONDITION
          </Text>
          <View style={styles.lightOptions}>
            {LIGHT_OPTIONS.map((option) => {
              const isActive = option.key === lightCondition;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  disabled={isSubmitting}
                  onPress={() => setLightCondition(option.key)}
                  style={styles.lightCardPressable}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[colors.primary, colors.primaryContainer]}
                      start={{ x: 0.12, y: 0.08 }}
                      end={{ x: 0.88, y: 0.92 }}
                      style={styles.lightCard}
                    >
                      <View
                        style={[
                          styles.lightIconWrap,
                          {
                            backgroundColor: "rgba(255,255,255,0.18)",
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
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.lightCard,
                        {
                          backgroundColor: colors.surfaceContainerLowest,
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
                        style={[styles.lightLabel, { color: colors.onSurface }]}
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
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleSkip}
            disabled={isSubmitting}
            style={styles.skipAction}
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

        <LinearGradient
          colors={["rgba(233, 237, 226, 0.02)", "rgba(233, 237, 226, 0.72)"]}
          start={{ x: 0.25, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
          style={styles.footerOrb}
          pointerEvents="none"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fbf9f4",
    paddingHorizontal: 30,
    paddingTop: 6,
    paddingBottom: 26,
    gap: 30,
    overflow: "hidden",
  },
  heroStarVertical: {
    position: "absolute",
    top: -98,
    left: "48%",
    marginLeft: -70,
    width: 140,
    height: 400,
    borderRadius: 100,
    backgroundColor: "#d8ded4",
    opacity: 0.78,
  },
  heroStarHorizontal: {
    position: "absolute",
    top: 34,
    left: -84,
    width: 620,
    height: 140,
    borderRadius: 100,
    backgroundColor: "#d8ded4",
    opacity: 0.78,
  },
  brand: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 18,
    lineHeight: 24,
  },
  copyBlock: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 34,
    lineHeight: 44,
  },
  imagePicker: {
    minHeight: 414,
    borderRadius: 34,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 10,
    paddingHorizontal: 24,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGloss: {
    ...StyleSheet.absoluteFillObject,
  },
  captureBadge: {
    width: 102,
    height: 102,
    borderRadius: 51,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(27, 28, 25, 0.04)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 6,
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
    gap: 12,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3,
  },
  searchField: {
    minHeight: 88,
    borderRadius: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    minHeight: 128,
    borderRadius: 22,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  lightIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  lightLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    gap: 24,
  },
  skipAction: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  footerOrb: {
    position: "absolute",
    right: -128,
    bottom: -106,
    width: 430,
    height: 430,
    borderRadius: 999,
  },
});

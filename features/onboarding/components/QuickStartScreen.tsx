import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
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
  const { colors, spacing } = useTheme();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 80,
          },
        ]}
      >
        <AppHeader
          title={"Add your first\nspecimen"}
          subtitle="Quick Start"
          showBackButton
        />

        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          Start with one plant so your garden opens with real data. You can add
          more details, photos, and care history after signup.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your first plant photo"
          disabled={isSubmitting}
          onPress={handlePickImage}
          style={[
            styles.imagePicker,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.surfaceContainerHigh,
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
              placeholderTextColor={colors.onSurfaceVariant}
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
                    <View
                      style={[
                        styles.lightCard,
                        { backgroundColor: colors.primary },
                      ]}
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
                    </View>
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
            icon="arrow-forward"
            iconFamily="MaterialIcons"
            iconPosition="trailing"
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    backgroundColor: "#fbf9f4",
    gap: 20,
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
    gap: 12,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3,
  },
  searchField: {
    minHeight: 72,
    borderRadius: 24,
    paddingHorizontal: 18,
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
    minHeight: 132,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
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
  skipText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
});

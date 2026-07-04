import * as ImagePicker from "expo-image-picker";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { isFeatureRequestBackendAvailable } from "@/features/product-feedback/api/featureRequestsClient";
import { FeatureRequestCard } from "@/features/product-feedback/components/FeatureRequestCard";
import { ProductFeedbackUnavailable } from "@/features/product-feedback/components/ProductFeedbackUnavailable";
import {
  FEATURE_REQUEST_CATEGORIES,
  FEEDBACK_SCREENSHOT_MAX,
} from "@/features/product-feedback/constants";
import {
  useSimilarFeatureRequests,
  useSubmitFeatureRequest,
  useUpdateFeatureRequestScreenshots,
} from "@/features/product-feedback/hooks/useSubmitFeatureRequest";
import { uploadFeedbackScreenshot } from "@/features/product-feedback/services/feedbackScreenshotService";
import type { FeatureRequestCategory } from "@/features/product-feedback/constants";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useGuestRouteGuard } from "@/features/auth/hooks/useGuestRouteGuard";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function NewFeatureRequestScreen() {
  const router = useRouter();
  useGuestRouteGuard({
    feature: "feature_requests",
    returnTo: "/feature-requests/new",
  });
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const plantsQuery = useAllActivePlants();
  const submitMutation = useSubmitFeatureRequest();
  const updateScreenshotsMutation = useUpdateFeatureRequestScreenshots();
  const similarMutation = useSimilarFeatureRequests();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FeatureRequestCategory>("Plant Care");
  const [plantId, setPlantId] = useState<string | null>(null);
  const [contactPreference, setContactPreference] = useState<
    "in_app" | "email" | "none"
  >("in_app");
  const [screenshots, setScreenshots] = useState<
    { uri: string; mimeType?: string | null }[]
  >([]);

  const plants = plantsQuery.data ?? [];

  useEffect(() => {
    if (title.trim().length < 3 || description.trim().length < 10) {
      return;
    }

    const timeout = setTimeout(() => {
      void similarMutation
        .mutateAsync({ title, description })
        .catch(() => undefined);
    }, 450);

    return () => clearTimeout(timeout);
  }, [title, description]);

  const similarRequests = similarMutation.data ?? [];

  const canSubmit = useMemo(
    () => title.trim().length >= 3 && description.trim().length >= 10,
    [title, description],
  );

  const pickScreenshot = async () => {
    if (screenshots.length >= FEEDBACK_SCREENSHOT_MAX) {
      snackbar.warning(`You can attach up to ${FEEDBACK_SCREENSHOT_MAX} screenshots.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setScreenshots((current) => [
      ...current,
      {
        uri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!user?.id || !canSubmit) {
      return;
    }

    try {
      const draft = await submitMutation.mutateAsync({
        title,
        description,
        category,
        plantId,
        contactPreference,
        screenshotUrls: [],
      });

      const uploadedUrls: string[] = [];
      for (const [index, screenshot] of screenshots.entries()) {
        const url = await uploadFeedbackScreenshot({
          userId: user.id,
          requestId: draft.id,
          localUri: screenshot.uri,
          index,
          mimeType: screenshot.mimeType,
        });
        uploadedUrls.push(url);
      }

      if (uploadedUrls.length) {
        await updateScreenshotsMutation.mutateAsync({
          requestId: draft.id,
          screenshotUrls: uploadedUrls,
        });
      }

      snackbar.success("Thank you — your idea has been shared.");
      router.replace(`/feature-requests/${draft.id}` as Href);
    } catch (error) {
      snackbar.error(
        error instanceof Error ? error.message : "Unable to submit your idea.",
      );
    }
  };

  if (!isFeatureRequestBackendAvailable()) {
    return (
      <ProfileScreenScaffold
        title="Share an Idea"
        subtitle="Feature request"
        description="Tell us what would make The Conservatory more useful."
      >
        <ProductFeedbackUnavailable />
      </ProfileScreenScaffold>
    );
  }

  return (
    <ProfileScreenScaffold
      title="Share an Idea"
      subtitle="Feature request"
      description="Be specific, stay calm, and focus on the experience you want — not a ticket queue."
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Short, clear summary"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[styles.input, { color: colors.onSurface }]}
        />

        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What problem would this solve?"
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          style={[styles.textArea, { color: colors.onSurface }]}
        />

        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {FEATURE_REQUEST_CATEGORIES.map((option) => {
              const selected = option === category;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => setCategory(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? colors.primaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.onPrimary : colors.primary },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {plants.length ? (
          <>
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
              Optional plant context
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPlantId(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: !plantId
                        ? colors.primaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: !plantId ? colors.onPrimary : colors.primary },
                    ]}
                  >
                    None
                  </Text>
                </Pressable>
                {plants.map((plant) => {
                  const selected = plantId === plant.id;
                  return (
                  <Pressable
                    key={plant.id}
                    accessibilityRole="button"
                    onPress={() => setPlantId(plant.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                            ? colors.primaryContainer
                            : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.onPrimary : colors.primary },
                      ]}
                    >
                      {plant.name}
                    </Text>
                  </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : null}

        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Contact preference
        </Text>
        <View style={styles.chipRow}>
          {(["in_app", "email", "none"] as const).map((option) => {
            const selected = contactPreference === option;
            return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setContactPreference(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                      ? colors.primaryContainer
                      : colors.surfaceContainerHigh,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.onPrimary : colors.primary },
                ]}
              >
                {option === "in_app"
                  ? "In-app updates"
                  : option === "email"
                    ? "Email"
                    : "No contact"}
              </Text>
            </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void pickScreenshot()}
          style={[
            styles.secondaryAction,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
        >
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>
            Add Screenshot ({screenshots.length}/{FEEDBACK_SCREENSHOT_MAX})
          </Text>
        </Pressable>

        <PrimaryButton
          label={submitMutation.isPending ? "Submitting..." : "Submit Idea"}
          disabled={!canSubmit || submitMutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </View>

      {similarRequests.length ? (
        <View style={styles.similarSection}>
          <Text style={[styles.similarTitle, { color: colors.primary }]}>
            Similar requests already exist
          </Text>
          <Text style={[styles.similarBody, { color: colors.onSurfaceVariant }]}>
            You can support an existing idea instead of creating a duplicate.
          </Text>
          {similarRequests.map((request) => (
            <FeatureRequestCard
              key={request.id}
              request={request}
              onPress={() => router.push(`/feature-requests/${request.id}` as Href)}
            />
          ))}
        </View>
      ) : null}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 8,
  },
  textArea: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  secondaryAction: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  similarSection: {
    gap: 12,
  },
  similarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  similarBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});

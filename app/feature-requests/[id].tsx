import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { isFeatureRequestBackendAvailable } from "@/features/product-feedback/api/featureRequestsClient";
import { FeatureRequestStatusBadge } from "@/features/product-feedback/components/FeatureRequestStatusBadge";
import { ProductFeedbackUnavailable } from "@/features/product-feedback/components/ProductFeedbackUnavailable";
import {
  useFeatureRequest,
  trackFeatureRequestStatusView,
} from "@/features/product-feedback/hooks/useFeatureRequest";
import { useVoteFeatureRequestMutation } from "@/features/product-feedback/hooks/useVoteFeatureRequest";
import {
  formatFeatureRequestDate,
} from "@/features/product-feedback/services/featureRequestStatusPresentation";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import {
  recordFeatureRequestNotificationClicked,
  recordFeatureRequestNotificationOpened,
} from "@/features/product-feedback/services/featureRequestNotificationService";
import { upsertReleasedFeatureFeedback } from "@/features/product-feedback/api/featureRequestsClient";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function FeatureRequestDetailScreen() {
  const router = useRouter();
  const { id, notificationId } = useLocalSearchParams<{
    id: string;
    notificationId?: string;
  }>();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const voteMutation = useVoteFeatureRequestMutation();
  const { request, updates, isLoading } = useFeatureRequest(id ?? "");

  useEffect(() => {
    if (request?.status) {
      trackFeatureRequestStatusView(id ?? "", request.status);
    }
  }, [id, request?.status]);

  useEffect(() => {
    if (!notificationId) {
      return;
    }

    void recordFeatureRequestNotificationOpened(notificationId).catch(
      () => undefined,
    );
  }, [notificationId]);

  useEffect(() => {
    if (request?.status === "released") {
      trackProductFeedbackEvent("released_feature_opened", {
        requestId: request.id,
      });

      if (notificationId) {
        void recordFeatureRequestNotificationClicked(
          notificationId,
          request.id,
        ).catch(() => undefined);
      }
    }
  }, [notificationId, request?.id, request?.status]);

  if (!isFeatureRequestBackendAvailable()) {
    return (
      <ProfileScreenScaffold
        title="Feature Request"
        subtitle="Details"
        description="Review the full request and follow its progress."
      >
        <ProductFeedbackUnavailable />
      </ProfileScreenScaffold>
    );
  }

  if (isLoading || !request) {
    return (
      <ProfileScreenScaffold
        title="Feature Request"
        subtitle="Details"
        description="Review the full request and follow its progress."
      >
        <ActivityIndicator color={colors.primary} />
      </ProfileScreenScaffold>
    );
  }

  const handleVote = () => {
    void voteMutation
      .mutateAsync({
        requestId: request.id,
        action: request.hasVoted ? "unvote" : "vote",
      })
      .catch((error: Error) => snackbar.error(error.message));
  };

  const handleFeedback = async (score: -1 | 1) => {
    if (!user?.id) {
      return;
    }

    try {
      await upsertReleasedFeatureFeedback({
        requestId: request.id,
        userId: user.id,
        score,
      });
      trackProductFeedbackEvent("released_feature_feedback", {
        requestId: request.id,
        score,
      });
      snackbar.success("Thank you for the feedback.");
    } catch (error) {
      snackbar.error(
        error instanceof Error ? error.message : "Unable to save feedback.",
      );
    }
  };

  return (
    <ProfileScreenScaffold
      title={request.title}
      subtitle={request.category}
      description={`Submitted ${formatFeatureRequestDate(request.createdAt)} · Updated ${formatFeatureRequestDate(request.updatedAt)}`}
    >
      <FeatureRequestStatusBadge status={request.status} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          request.hasVoted
            ? `Remove support, ${request.voteCount} votes`
            : `Support this request, ${request.voteCount} votes`
        }
        onPress={handleVote}
        style={[
          styles.voteButton,
          {
            backgroundColor: request.hasVoted
              ? colors.primaryContainer
              : colors.surfaceContainerLow,
          },
        ]}
      >
        <Text style={[styles.voteButtonText, { color: colors.primary }]}>
          {request.hasVoted ? "Supported" : "Support this idea"} · {request.voteCount}
        </Text>
      </Pressable>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.body, { color: colors.onSurface }]}>
          {request.description}
        </Text>
      </View>

      {request.screenshotUrls.length ? (
        <View style={styles.screenshotRow}>
          {request.screenshotUrls.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.screenshot} />
          ))}
        </View>
      ) : null}

      {updates.length ? (
        <View style={styles.updatesSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Updates
          </Text>
          {updates.map((update) => (
            <View
              key={update.id}
              style={[
                styles.updateCard,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text style={[styles.updateDate, { color: colors.onSurfaceVariant }]}>
                {formatFeatureRequestDate(update.createdAt)}
              </Text>
              <Text style={[styles.updateBody, { color: colors.onSurface }]}>
                {update.updateText}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {request.status === "released" && request.releaseNotes ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Release Notes
          </Text>
          {request.releaseVersion ? (
            <Text style={[styles.releaseVersion, { color: colors.secondary }]}>
              Version {request.releaseVersion}
            </Text>
          ) : null}
          <Text style={[styles.body, { color: colors.onSurface }]}>
            {request.releaseNotes}
          </Text>
        </View>
      ) : null}

      {request.status === "released" ? (
        <View style={styles.feedbackRow}>
          <Text style={[styles.feedbackLabel, { color: colors.onSurfaceVariant }]}>
            Was this helpful?
          </Text>
          <View style={styles.feedbackActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleFeedback(1)}
              style={[
                styles.feedbackButton,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.feedbackButtonText, { color: colors.primary }]}>
                Yes
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleFeedback(-1)}
              style={[
                styles.feedbackButton,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.feedbackButtonText, { color: colors.primary }]}>
                Not really
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {request.mergedIntoId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(`/feature-requests/${request.mergedIntoId}` as Href)
          }
        >
          <Text style={[styles.mergedLink, { color: colors.secondary }]}>
            View merged request
          </Text>
        </Pressable>
      ) : null}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  voteButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  voteButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
  },
  screenshotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  screenshot: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  updatesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  updateCard: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  updateDate: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  updateBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  releaseVersion: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  feedbackRow: {
    gap: 10,
  },
  feedbackLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  feedbackActions: {
    flexDirection: "row",
    gap: 10,
  },
  feedbackButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  feedbackButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  mergedLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
});

import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { isFeatureRequestBackendAvailable } from "@/features/product-feedback/api/featureRequestsClient";
import { FeatureRequestListSection } from "@/features/product-feedback/components/FeatureRequestListSection";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { ProductFeedbackUnavailable } from "@/features/product-feedback/components/ProductFeedbackUnavailable";
import { useFeatureRequests } from "@/features/product-feedback/hooks/useFeatureRequests";
import { useVoteFeatureRequestMutation } from "@/features/product-feedback/hooks/useVoteFeatureRequest";
import {
  useBetaProgramConsent,
  useUpdateBetaProgramConsent,
} from "@/features/product-feedback/hooks/useBetaProgramConsent";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useSnackbar } from "@/hooks/useSnackbar";

function flattenSection(query: ReturnType<typeof useFeatureRequests>) {
  return query.data?.pages.flatMap((page) => page.requests) ?? [];
}

export default function FeatureRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const voteMutation = useVoteFeatureRequestMutation();
  const betaConsentQuery = useBetaProgramConsent();
  const betaConsentMutation = useUpdateBetaProgramConsent();
  const [searchQuery, setSearchQuery] = useState("");
  const popularQuery = useFeatureRequests("popular");
  const recentQuery = useFeatureRequests("recent");
  const shippedQuery = useFeatureRequests("shipped");
  const mineQuery = useFeatureRequests("mine");
  const searchResultsQuery = useFeatureRequests(
    "search",
    searchQuery.trim().length >= 2 ? searchQuery : undefined,
  );

  const isLoading =
    popularQuery.isLoading ||
    recentQuery.isLoading ||
    shippedQuery.isLoading ||
    mineQuery.isLoading;

  const popular = useMemo(() => flattenSection(popularQuery), [popularQuery.data]);
  const recent = useMemo(() => flattenSection(recentQuery), [recentQuery.data]);
  const shipped = useMemo(() => flattenSection(shippedQuery), [shippedQuery.data]);
  const mine = useMemo(() => flattenSection(mineQuery), [mineQuery.data]);
  const searchResults = useMemo(
    () => flattenSection(searchResultsQuery),
    [searchResultsQuery.data],
  );

  const handleVote = (requestId: string, hasVoted?: boolean) => {
    void voteMutation
      .mutateAsync({ requestId, action: hasVoted ? "unvote" : "vote" })
      .catch((error: Error) => snackbar.error(error.message));
  };

  const openRequest = (requestId: string, section: string) => {
    trackProductFeedbackEvent("feature_request_opened", {
      surface: "hub",
      section,
      requestId,
    });
    router.push(`/feature-requests/${requestId}` as Href);
  };

  if (!isFeatureRequestBackendAvailable()) {
    return (
      <ProfileScreenScaffold
        title="Product Feedback"
        subtitle="Feature requests"
        description="Share ideas that could make The Conservatory more thoughtful, useful, and calm."
      >
        <ProductFeedbackUnavailable />
      </ProfileScreenScaffold>
    );
  }

  return (
    <ProfileScreenScaffold
      title="Product Feedback"
      subtitle="Feature requests"
      description="Help shape the roadmap. Share ideas, support what matters, and follow what ships."
    >
      <View style={styles.actions}>
        <PrimaryButton
          label="Share an Idea"
          onPress={() => {
            trackProductFeedbackEvent("feature_request_opened", { surface: "new" });
            router.push("/feature-requests/new" as Href);
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/roadmap" as Href)}
          style={[
            styles.secondaryAction,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>
            View Roadmap
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{
          checked: betaConsentQuery.data?.optedIn ?? false,
        }}
        onPress={() => {
          const nextOptedIn = !(betaConsentQuery.data?.optedIn ?? false);
          void betaConsentMutation
            .mutateAsync({
              optedIn: nextOptedIn,
              earlyAccess: nextOptedIn,
              betaReleases: nextOptedIn,
              feedbackProgram: nextOptedIn,
            })
            .catch((error: Error) => snackbar.error(error.message));
        }}
        style={[
          styles.betaCard,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <Text style={[styles.betaTitle, { color: colors.primary }]}>
          Beta feedback program
        </Text>
        <Text style={[styles.betaBody, { color: colors.onSurfaceVariant }]}>
          {betaConsentQuery.data?.optedIn
            ? "You are opted in to early access and product feedback invitations."
            : "Opt in to hear about early access and help shape upcoming releases."}
        </Text>
      </Pressable>

      <View
        style={[
          styles.searchCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <TextInput
          accessibilityLabel="Search feature requests"
          placeholder="Search ideas"
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={(value) => {
            setSearchQuery(value);
            if (value.trim().length >= 2) {
              trackProductFeedbackEvent("feature_request_search", {
                queryLength: value.trim().length,
              });
            }
          }}
          style={[styles.searchInput, { color: colors.onSurface }]}
        />
      </View>

      {searchQuery.trim().length >= 2 ? (
        <FeatureRequestListSection
          title="Search Results"
          requests={searchResults}
          onRequestPress={(requestId) => openRequest(requestId, "search")}
          onVotePress={(request) => handleVote(request.id, request.hasVoted)}
          emptyContent={getEmptyStateForContext({
            context: "featureRequests.searchEmpty",
          })}
          emptyReason="search_empty"
          hasMore={Boolean(searchResultsQuery.hasNextPage)}
          isLoadingMore={searchResultsQuery.isFetchingNextPage}
          onLoadMore={() => void searchResultsQuery.fetchNextPage()}
        />
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <FeatureRequestListSection
            title="Popular Requests"
            subtitle="Ideas the community is supporting most."
            requests={popular}
            onRequestPress={(requestId) => openRequest(requestId, "popular")}
            onVotePress={(request) => handleVote(request.id, request.hasVoted)}
            hasMore={Boolean(popularQuery.hasNextPage)}
            isLoadingMore={popularQuery.isFetchingNextPage}
            onLoadMore={() => void popularQuery.fetchNextPage()}
          />
          <FeatureRequestListSection
            title="Recently Added"
            requests={recent}
            onRequestPress={(requestId) => openRequest(requestId, "recent")}
            onVotePress={(request) => handleVote(request.id, request.hasVoted)}
            hasMore={Boolean(recentQuery.hasNextPage)}
            isLoadingMore={recentQuery.isFetchingNextPage}
            onLoadMore={() => void recentQuery.fetchNextPage()}
          />
          <FeatureRequestListSection
            title="Recently Shipped"
            requests={shipped}
            onRequestPress={(requestId) => openRequest(requestId, "shipped")}
            onVotePress={(request) => handleVote(request.id, request.hasVoted)}
            hasMore={Boolean(shippedQuery.hasNextPage)}
            isLoadingMore={shippedQuery.isFetchingNextPage}
            onLoadMore={() => void shippedQuery.fetchNextPage()}
          />
          <FeatureRequestListSection
            title="Your Requests"
            requests={mine}
            onRequestPress={(requestId) => openRequest(requestId, "mine")}
            onVotePress={(request) => handleVote(request.id, request.hasVoted)}
            emptyContent={getEmptyStateForContext({
              context: "featureRequests.mineEmpty",
            })}
            emptyReason="mine_empty"
            emptyPrimaryHref="/feature-requests/new"
            hasMore={Boolean(mineQuery.hasNextPage)}
            isLoadingMore={mineQuery.isFetchingNextPage}
            onLoadMore={() => void mineQuery.fetchNextPage()}
          />
        </>
      )}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  secondaryAction: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  searchCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  searchInput: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 12,
  },
  betaCard: {
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  betaTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  betaBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});

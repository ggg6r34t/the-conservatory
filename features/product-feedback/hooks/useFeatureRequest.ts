import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getFeatureRequest,
  getFeatureRequestUpdates,
  isFeatureRequestBackendAvailable,
} from "@/features/product-feedback/api/featureRequestsClient";
import {
  getCachedFeatureRequest,
  upsertCachedFeatureRequest,
} from "@/features/product-feedback/services/featureRequestCacheService";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import type { FeatureRequest } from "@/features/product-feedback/types";

export function useFeatureRequest(requestId: string) {
  const { user } = useAuth();

  const requestQuery = useQuery({
    queryKey: [...queryKeys.featureRequest(requestId), user?.id ?? "anonymous"],
    enabled: Boolean(user?.id && requestId) && isFeatureRequestBackendAvailable(),
    queryFn: async () => {
      try {
        const request = await getFeatureRequest({
          requestId,
          userId: user!.id,
        });

        if (request) {
          await upsertCachedFeatureRequest(request);
        }

        return request;
      } catch (error) {
        const cached = await getCachedFeatureRequest(requestId);
        if (cached) {
          return cached;
        }

        throw error;
      }
    },
  });

  const updatesQuery = useQuery({
    queryKey: [...queryKeys.featureRequest(requestId), "updates"],
    enabled: Boolean(requestId) && isFeatureRequestBackendAvailable(),
    queryFn: () => getFeatureRequestUpdates(requestId),
  });

  return {
    request: requestQuery.data,
    updates: updatesQuery.data ?? [],
    isLoading: requestQuery.isLoading || updatesQuery.isLoading,
    refetch: async () => {
      await Promise.all([requestQuery.refetch(), updatesQuery.refetch()]);
    },
  };
}

export function trackFeatureRequestStatusView(requestId: string, status?: string) {
  if (!status) {
    return;
  }

  trackProductFeedbackEvent("feature_request_status_viewed", {
    requestId,
    status,
  });
}

export function useInvalidateFeatureRequest(requestId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.featureRequest(requestId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.featureRequests });
  };
}

export function applyOptimisticFeatureRequestVote(input: {
  request: FeatureRequest;
  action: "vote" | "unvote";
}) {
  const nextVoteCount =
    input.action === "vote"
      ? input.request.voteCount + 1
      : Math.max(input.request.voteCount - 1, 0);

  return {
    ...input.request,
    voteCount: nextVoteCount,
    hasVoted: input.action === "vote",
  };
}

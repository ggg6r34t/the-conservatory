import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  removeFeatureRequestVote,
  voteFeatureRequest,
} from "@/features/product-feedback/api/featureRequestsClient";
import {
  applyOptimisticFeatureRequestVote,
} from "@/features/product-feedback/hooks/useFeatureRequest";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import type { FeatureRequest } from "@/features/product-feedback/types";

type FeatureRequestListPage = {
  requests: FeatureRequest[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function useVoteFeatureRequestMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { requestId: string; action: "vote" | "unvote" }) => {
      if (input.action === "vote") {
        await voteFeatureRequest({ requestId: input.requestId, userId: user!.id });
        trackProductFeedbackEvent("feature_request_voted", {
          requestId: input.requestId,
        });
        return;
      }

      await removeFeatureRequestVote({
        requestId: input.requestId,
        userId: user!.id,
      });
      trackProductFeedbackEvent("feature_request_removed_vote", {
        requestId: input.requestId,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.featureRequests });
      await queryClient.cancelQueries({
        queryKey: queryKeys.featureRequest(input.requestId),
      });

      const previousLists = queryClient.getQueriesData<{
        pages: FeatureRequestListPage[];
        pageParams: number[];
      }>({ queryKey: queryKeys.featureRequests });
      const previousDetail = queryClient.getQueryData<FeatureRequest>([
        ...queryKeys.featureRequest(input.requestId),
        user?.id ?? "anonymous",
      ]);

      const patchRequest = (request: FeatureRequest) => {
        if (request.id !== input.requestId) {
          return request;
        }

        return applyOptimisticFeatureRequestVote({
          request,
          action: input.action,
        });
      };

      for (const [key, data] of previousLists) {
        if (!data) {
          continue;
        }

        queryClient.setQueryData(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            requests: page.requests.map(patchRequest),
          })),
        });
      }

      if (previousDetail) {
        queryClient.setQueryData(
          [...queryKeys.featureRequest(input.requestId), user?.id ?? "anonymous"],
          applyOptimisticFeatureRequestVote({
            request: previousDetail,
            action: input.action,
          }),
        );
      }

      return { previousLists, previousDetail };
    },
    onError: (_error, input, context) => {
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }

      if (context?.previousDetail) {
        queryClient.setQueryData(
          [...queryKeys.featureRequest(input.requestId), user?.id ?? "anonymous"],
          context.previousDetail,
        );
      }
    },
    onSettled: (_result, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.featureRequest(input.requestId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureRequests });
    },
  });
}

/** @deprecated Use useVoteFeatureRequestMutation */
export function useVoteFeatureRequest(requestId: string) {
  const mutation = useVoteFeatureRequestMutation();
  return {
    ...mutation,
    mutateAsync: (action: "vote" | "unvote") =>
      mutation.mutateAsync({ requestId, action }),
  };
}

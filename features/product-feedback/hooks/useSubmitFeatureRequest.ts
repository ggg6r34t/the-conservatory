import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  findSimilarFeatureRequests,
  submitFeatureRequest,
  updateFeatureRequestScreenshots,
} from "@/features/product-feedback/api/featureRequestsClient";
import { submitFeatureRequestSchema } from "@/features/product-feedback/schemas/featureRequestSchemas";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import type { SubmitFeatureRequestInput } from "@/features/product-feedback/types";
import { useInvalidateFeatureRequests } from "@/features/product-feedback/hooks/useFeatureRequests";

export function useSubmitFeatureRequest() {
  const { user } = useAuth();
  const invalidate = useInvalidateFeatureRequests();

  return useMutation({
    mutationFn: async (payload: SubmitFeatureRequestInput) => {
      const parsed = submitFeatureRequestSchema.parse(payload);
      const request = await submitFeatureRequest({
        userId: user!.id,
        payload: parsed,
      });

      trackProductFeedbackEvent("feature_request_submitted", {
        requestId: request.id,
        category: request.category,
        hasPlantContext: Boolean(request.plantId),
        screenshotCount: parsed.screenshotUrls?.length ?? 0,
      });

      return request;
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useUpdateFeatureRequestScreenshots() {
  const invalidate = useInvalidateFeatureRequests();

  return useMutation({
    mutationFn: updateFeatureRequestScreenshots,
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useSimilarFeatureRequests() {
  return useMutation({
    mutationFn: async (input: { title: string; description: string }) => {
      const matches = await findSimilarFeatureRequests(input);
      if (matches.length) {
        trackProductFeedbackEvent("feature_request_duplicate_suggested", {
          matchCount: matches.length,
        });
      }
      return matches;
    },
  });
}

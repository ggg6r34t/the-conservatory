import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getBetaProgramConsent,
  isFeatureRequestBackendAvailable,
  upsertBetaProgramConsent,
} from "@/features/product-feedback/api/featureRequestsClient";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";

export function useBetaProgramConsent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.betaProgram, user?.id ?? "anonymous"],
    enabled: Boolean(user?.id) && isFeatureRequestBackendAvailable(),
    queryFn: () => getBetaProgramConsent(user!.id),
  });
}

export function useUpdateBetaProgramConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      optedIn: boolean;
      earlyAccess: boolean;
      betaReleases: boolean;
      feedbackProgram: boolean;
    }) =>
      upsertBetaProgramConsent({
        userId: user!.id,
        ...input,
      }),
    onSuccess: (result) => {
      if (result.optedIn) {
        trackProductFeedbackEvent("beta_program_opt_in");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.betaProgram });
    },
  });
}

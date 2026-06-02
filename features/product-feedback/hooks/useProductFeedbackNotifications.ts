import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  isFeatureRequestBackendAvailable,
  listFeatureRequestNotifications,
} from "@/features/product-feedback/api/featureRequestsClient";
import { deliverPendingFeatureReleaseNotifications } from "@/features/product-feedback/services/featureRequestNotificationService";

export function useProductFeedbackNotifications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...queryKeys.productFeedbackNotifications, user?.id ?? "anonymous"],
    enabled: Boolean(user?.id) && isFeatureRequestBackendAvailable(),
    staleTime: 1000 * 60 * 5,
    queryFn: () => listFeatureRequestNotifications(user!.id),
  });

  useEffect(() => {
    if (!user?.id || !isFeatureRequestBackendAvailable()) {
      return;
    }

    void deliverPendingFeatureReleaseNotifications(user.id).catch(() => undefined);
  }, [user?.id]);

  return query;
}

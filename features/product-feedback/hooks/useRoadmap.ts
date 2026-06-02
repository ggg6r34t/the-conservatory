import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import {
  isFeatureRequestBackendAvailable,
  listRoadmapItems,
} from "@/features/product-feedback/api/featureRequestsClient";
import {
  readFeatureRequestCache,
  writeFeatureRequestCache,
} from "@/features/product-feedback/services/featureRequestCacheService";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";

export function useRoadmap() {
  return useQuery({
    queryKey: queryKeys.roadmap,
    enabled: isFeatureRequestBackendAvailable(),
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      try {
        const items = await listRoadmapItems();
        const cache = await readFeatureRequestCache();
        await writeFeatureRequestCache({
          requests: cache?.requests ?? [],
          roadmap: items,
        });
        trackProductFeedbackEvent("roadmap_viewed", { itemCount: items.length });
        return items;
      } catch (error) {
        const cache = await readFeatureRequestCache();
        if (cache?.roadmap.length) {
          trackProductFeedbackEvent("roadmap_viewed", {
            itemCount: cache.roadmap.length,
            offline: true,
          });
          return cache.roadmap;
        }

        throw error;
      }
    },
  });
}

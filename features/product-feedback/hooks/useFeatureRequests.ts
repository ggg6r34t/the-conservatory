import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  isFeatureRequestBackendAvailable,
  listFeatureRequests,
} from "@/features/product-feedback/api/featureRequestsClient";
import { FEATURE_REQUEST_PAGE_SIZE } from "@/features/product-feedback/constants";
import {
  buildCachedFeatureRequestPage,
  readFeatureRequestCache,
  writeFeatureRequestCache,
} from "@/features/product-feedback/services/featureRequestCacheService";
import type { FeatureRequestListSection } from "@/features/product-feedback/types";

export function useFeatureRequests(section: FeatureRequestListSection, searchQuery?: string) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.featureRequests,
      section,
      user?.id ?? "anonymous",
      searchQuery ?? "",
    ],
    enabled: Boolean(user?.id) && isFeatureRequestBackendAvailable(),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async ({ pageParam }) => {
      try {
        const result = await listFeatureRequests({
          userId: user!.id,
          section,
          page: pageParam,
          pageSize: FEATURE_REQUEST_PAGE_SIZE,
          searchQuery,
        });

        if (pageParam === 0) {
          const cache = await readFeatureRequestCache();
          await writeFeatureRequestCache({
            requests: result.requests,
            roadmap: cache?.roadmap ?? [],
          });
        }

        return result;
      } catch (error) {
        if (pageParam !== 0) {
          throw error;
        }

        const cached = await buildCachedFeatureRequestPage({
          section,
          userId: user!.id,
          searchQuery,
        });

        if (!cached) {
          throw error;
        }

        return {
          requests: cached.requests,
          total: cached.total,
          page: cached.page,
          pageSize: cached.pageSize,
          hasMore: cached.hasMore,
        };
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useInvalidateFeatureRequests() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.featureRequests });
  };
}

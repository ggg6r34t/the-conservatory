import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  FEATURE_REQUEST_CACHE_KEY,
  FEATURE_REQUEST_PAGE_SIZE,
} from "@/features/product-feedback/constants";
import type {
  FeatureRequest,
  FeatureRequestListSection,
  RoadmapItem,
} from "@/features/product-feedback/types";

type FeatureRequestCachePayload = {
  savedAt: string;
  requests: FeatureRequest[];
  roadmap: RoadmapItem[];
  requestsById: Record<string, FeatureRequest>;
};

function emptyCachePayload(): FeatureRequestCachePayload {
  return {
    savedAt: new Date().toISOString(),
    requests: [],
    roadmap: [],
    requestsById: {},
  };
}

function normalizeCachePayload(
  payload: Partial<FeatureRequestCachePayload> | null,
): FeatureRequestCachePayload {
  if (!payload) {
    return emptyCachePayload();
  }

  const requests = payload.requests ?? [];
  const requestsById = {
    ...(payload.requestsById ?? {}),
  };

  for (const request of requests) {
    requestsById[request.id] = request;
  }

  return {
    savedAt: payload.savedAt ?? new Date().toISOString(),
    requests,
    roadmap: payload.roadmap ?? [],
    requestsById,
  };
}

export function filterCachedRequestsBySection(
  requests: FeatureRequest[],
  section: FeatureRequestListSection,
  userId: string,
) {
  const visible = requests.filter((request) => !request.archived);

  switch (section) {
    case "popular":
      return [...visible].sort(
        (left, right) =>
          right.voteCount - left.voteCount ||
          right.createdAt.localeCompare(left.createdAt),
      );
    case "shipped":
      return visible
        .filter((request) => request.status === "released")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    case "mine":
      return visible
        .filter((request) => request.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    case "search":
    case "recent":
    default:
      return [...visible].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
  }
}

export async function readFeatureRequestCache(): Promise<FeatureRequestCachePayload | null> {
  const raw = await AsyncStorage.getItem(FEATURE_REQUEST_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeCachePayload(JSON.parse(raw) as FeatureRequestCachePayload);
  } catch {
    return null;
  }
}

export async function writeFeatureRequestCache(input: {
  requests: FeatureRequest[];
  roadmap: RoadmapItem[];
}) {
  const existing = await readFeatureRequestCache();
  const requestsById = { ...(existing?.requestsById ?? {}) };

  for (const request of input.requests) {
    requestsById[request.id] = request;
  }

  const payload: FeatureRequestCachePayload = {
    savedAt: new Date().toISOString(),
    requests: input.requests,
    roadmap: input.roadmap,
    requestsById,
  };

  await AsyncStorage.setItem(FEATURE_REQUEST_CACHE_KEY, JSON.stringify(payload));
}

export async function upsertCachedFeatureRequest(request: FeatureRequest) {
  const cache = normalizeCachePayload(await readFeatureRequestCache());
  cache.requestsById[request.id] = request;
  cache.requests = Object.values(cache.requestsById).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  cache.savedAt = new Date().toISOString();
  await AsyncStorage.setItem(FEATURE_REQUEST_CACHE_KEY, JSON.stringify(cache));
}

export async function getCachedFeatureRequest(requestId: string) {
  const cache = await readFeatureRequestCache();
  return cache?.requestsById[requestId] ?? null;
}

export async function buildCachedFeatureRequestPage(input: {
  section: FeatureRequestListSection;
  userId: string;
  searchQuery?: string;
}) {
  const cache = await readFeatureRequestCache();
  if (!cache?.requests.length) {
    return null;
  }

  let requests = filterCachedRequestsBySection(
    cache.requests,
    input.section,
    input.userId,
  );

  if (input.searchQuery?.trim()) {
    const needle = input.searchQuery.trim().toLowerCase();
    requests = requests.filter(
      (request) =>
        request.title.toLowerCase().includes(needle) ||
        request.description.toLowerCase().includes(needle),
    );
  }

  return {
    requests: requests.slice(0, FEATURE_REQUEST_PAGE_SIZE),
    total: requests.length,
    page: 0,
    pageSize: FEATURE_REQUEST_PAGE_SIZE,
    hasMore: requests.length > FEATURE_REQUEST_PAGE_SIZE,
    savedAt: cache.savedAt,
  };
}

export async function clearFeatureRequestCache() {
  await AsyncStorage.removeItem(FEATURE_REQUEST_CACHE_KEY);
}

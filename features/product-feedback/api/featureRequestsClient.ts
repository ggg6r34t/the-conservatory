import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { FEATURE_REQUEST_PAGE_SIZE } from "@/features/product-feedback/constants";
import type {
  BetaProgramConsent,
  FeatureRequest,
  FeatureRequestListSection,
  FeatureRequestNotification,
  FeatureRequestUpdate,
  RoadmapItem,
  SubmitFeatureRequestInput,
} from "@/features/product-feedback/types";

function assertSupabaseConfigured() {
  if (!env.isSupabaseConfigured || !supabase) {
    throw new Error(
      "Feature requests require cloud connectivity. Please sign in when online.",
    );
  }

  return supabase;
}

function mapFeatureRequest(row: Record<string, unknown>): FeatureRequest {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : "",
    title: String(row.title),
    description: String(row.description),
    category: row.category as FeatureRequest["category"],
    status: row.status as FeatureRequest["status"],
    plantId: row.plant_id ? String(row.plant_id) : null,
    contactPreference: row.contact_preference as FeatureRequest["contactPreference"],
    screenshotUrls: Array.isArray(row.screenshot_urls)
      ? row.screenshot_urls.map(String)
      : [],
    voteCount: Number(row.vote_count ?? 0),
    archived: Boolean(row.archived),
    mergedIntoId: row.merged_into_id ? String(row.merged_into_id) : null,
    releaseVersion: row.release_version ? String(row.release_version) : null,
    releaseNotes: row.release_notes ? String(row.release_notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    hasVoted: row.has_voted === true,
  };
}

function mapUpdate(row: Record<string, unknown>): FeatureRequestUpdate {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    updateText: String(row.update_text),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

function mapRoadmapItem(row: Record<string, unknown>): RoadmapItem {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    status: row.status as RoadmapItem["status"],
    releaseVersion: row.release_version ? String(row.release_version) : null,
    releaseNotes: row.release_notes ? String(row.release_notes) : null,
    linkedRequestIds: Array.isArray(row.linked_request_ids)
      ? row.linked_request_ids.map(String)
      : [],
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapNotification(row: Record<string, unknown>): FeatureRequestNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    requestId: row.request_id ? String(row.request_id) : null,
    roadmapItemId: row.roadmap_item_id ? String(row.roadmap_item_id) : null,
    title: String(row.title),
    body: String(row.body),
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    openedAt: row.opened_at ? String(row.opened_at) : null,
    clickedAt: row.clicked_at ? String(row.clicked_at) : null,
    createdAt: String(row.created_at),
  };
}

async function attachVoteState(
  requests: FeatureRequest[],
  userId: string,
): Promise<FeatureRequest[]> {
  if (!requests.length) {
    return requests;
  }

  const client = assertSupabaseConfigured();
  const requestIds = requests.map((request) => request.id);
  const { data, error } = await client
    .from("feature_request_votes")
    .select("request_id")
    .eq("user_id", userId)
    .in("request_id", requestIds);

  if (error) {
    throw new Error(error.message);
  }

  const votedIds = new Set((data ?? []).map((row) => String(row.request_id)));
  return requests.map((request) => ({
    ...request,
    hasVoted: votedIds.has(request.id),
  }));
}

function sectionOrder(section: FeatureRequestListSection) {
  switch (section) {
    case "popular":
      return { column: "vote_count", ascending: false };
    case "recent":
      return { column: "created_at", ascending: false };
    case "shipped":
      return { column: "updated_at", ascending: false };
    case "mine":
      return { column: "created_at", ascending: false };
    default:
      return { column: "created_at", ascending: false };
  }
}

export async function listFeatureRequests(input: {
  userId: string;
  section: FeatureRequestListSection;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}) {
  const client = assertSupabaseConfigured();
  const page = input.page ?? 0;
  const pageSize = input.pageSize ?? FEATURE_REQUEST_PAGE_SIZE;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const order = sectionOrder(input.section);

  let query = client
    .from("feature_requests")
    .select("*", { count: "exact" })
    .eq("archived", false)
    .order(order.column, { ascending: order.ascending });

  if (input.section === "shipped") {
    query = query.eq("status", "released");
  }

  if (input.section === "mine") {
    query = query.eq("user_id", input.userId);
  }

  if (input.searchQuery?.trim()) {
    query = query.textSearch("search_vector", input.searchQuery.trim(), {
      type: "websearch",
    });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const requests = await attachVoteState(
    (data ?? []).map((row) => mapFeatureRequest(row)),
    input.userId,
  );

  return {
    requests,
    total: count ?? requests.length,
    page,
    pageSize,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function getFeatureRequest(input: {
  requestId: string;
  userId: string;
}) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("feature_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [request] = await attachVoteState(
    [mapFeatureRequest(data)],
    input.userId,
  );
  return request;
}

export async function getFeatureRequestUpdates(requestId: string) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("feature_request_updates")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapUpdate(row));
}

export async function submitFeatureRequest(input: {
  userId: string;
  payload: SubmitFeatureRequestInput;
}) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("feature_requests")
    .insert({
      user_id: input.userId,
      title: input.payload.title.trim(),
      description: input.payload.description.trim(),
      category: input.payload.category,
      plant_id: input.payload.plantId ?? null,
      contact_preference: input.payload.contactPreference ?? "in_app",
      screenshot_urls: input.payload.screenshotUrls ?? [],
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapFeatureRequest(data);
}

export async function findSimilarFeatureRequests(input: {
  title: string;
  description: string;
  limit?: number;
}) {
  const client = assertSupabaseConfigured();
  const queryText = `${input.title} ${input.description}`.trim();
  const { data, error } = await client
    .from("feature_requests")
    .select("id, title, description, vote_count, status, created_at")
    .eq("archived", false)
    .textSearch("search_vector", queryText, { type: "websearch" })
    .order("vote_count", { ascending: false })
    .limit(input.limit ?? 5);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapFeatureRequest(row));
}

export async function voteFeatureRequest(input: {
  requestId: string;
  userId: string;
}) {
  const client = assertSupabaseConfigured();
  const { error } = await client.from("feature_request_votes").insert({
    request_id: input.requestId,
    user_id: input.userId,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already supported this request.");
    }
    throw new Error(error.message);
  }
}

export async function removeFeatureRequestVote(input: {
  requestId: string;
  userId: string;
}) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("feature_request_votes")
    .delete()
    .eq("request_id", input.requestId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listRoadmapItems() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("roadmap_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRoadmapItem(row));
}

export async function listFeatureRequestNotifications(userId: string) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("feature_request_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapNotification(row));
}

export async function markFeatureRequestNotificationDelivered(
  notificationId: string,
) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("feature_request_notifications")
    .update({
      delivered_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markFeatureRequestNotificationOpened(notificationId: string) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("feature_request_notifications")
    .update({
      opened_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markFeatureRequestNotificationClicked(notificationId: string) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("feature_request_notifications")
    .update({
      clicked_at: new Date().toISOString(),
      opened_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertReleasedFeatureFeedback(input: {
  requestId: string;
  userId: string;
  score: -1 | 1;
}) {
  const client = assertSupabaseConfigured();
  const { error } = await client.from("feature_request_feedback_scores").upsert(
    {
      request_id: input.requestId,
      user_id: input.userId,
      score: input.score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "request_id,user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getBetaProgramConsent(
  userId: string,
): Promise<BetaProgramConsent | null> {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("beta_program_consents")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    userId: String(data.user_id),
    optedIn: Boolean(data.opted_in),
    earlyAccess: Boolean(data.early_access),
    betaReleases: Boolean(data.beta_releases),
    feedbackProgram: Boolean(data.feedback_program),
    consentedAt: data.consented_at ? String(data.consented_at) : null,
    updatedAt: String(data.updated_at),
  };
}

export async function upsertBetaProgramConsent(input: {
  userId: string;
  optedIn: boolean;
  earlyAccess: boolean;
  betaReleases: boolean;
  feedbackProgram: boolean;
}) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("beta_program_consents")
    .upsert(
      {
        user_id: input.userId,
        opted_in: input.optedIn,
        early_access: input.earlyAccess,
        beta_releases: input.betaReleases,
        feedback_program: input.feedbackProgram,
        consented_at: input.optedIn ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId: String(data.user_id),
    optedIn: Boolean(data.opted_in),
    earlyAccess: Boolean(data.early_access),
    betaReleases: Boolean(data.beta_releases),
    feedbackProgram: Boolean(data.feedback_program),
    consentedAt: data.consented_at ? String(data.consented_at) : null,
    updatedAt: String(data.updated_at),
  } satisfies BetaProgramConsent;
}

export async function updateFeatureRequestScreenshots(input: {
  requestId: string;
  screenshotUrls: string[];
}) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("feature_requests")
    .update({ screenshot_urls: input.screenshotUrls })
    .eq("id", input.requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export function isFeatureRequestBackendAvailable() {
  return env.isSupabaseConfigured && Boolean(supabase);
}

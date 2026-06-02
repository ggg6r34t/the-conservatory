jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
  },
}));

import { supabase } from "@/config/supabase";
import {
  FEATURE_REQUEST_CATEGORIES,
  FEATURE_REQUEST_STATUSES,
} from "@/features/product-feedback/constants";
import { submitFeatureRequestSchema } from "@/features/product-feedback/schemas/featureRequestSchemas";
import {
  applyOptimisticFeatureRequestVote,
  trackFeatureRequestStatusView,
} from "@/features/product-feedback/hooks/useFeatureRequest";
import {
  buildCachedFeatureRequestPage,
  clearFeatureRequestCache,
  filterCachedRequestsBySection,
  readFeatureRequestCache,
  upsertCachedFeatureRequest,
  writeFeatureRequestCache,
} from "@/features/product-feedback/services/featureRequestCacheService";
import {
  formatFeatureRequestDate,
  getFeatureRequestStatusPresentation,
} from "@/features/product-feedback/services/featureRequestStatusPresentation";
import {
  recordFeatureRequestNotificationClicked,
  recordFeatureRequestNotificationOpened,
} from "@/features/product-feedback/services/featureRequestNotificationService";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import {
  markFeatureRequestNotificationDelivered,
  markFeatureRequestNotificationClicked,
  markFeatureRequestNotificationOpened,
  voteFeatureRequest,
} from "@/features/product-feedback/api/featureRequestsClient";
import type { FeatureRequest } from "@/features/product-feedback/types";

jest.mock("@/features/product-feedback/services/featureRequestAnalyticsService", () => ({
  trackProductFeedbackEvent: jest.fn(),
}));

jest.mock("@/features/product-feedback/api/featureRequestsClient", () => {
  const actual = jest.requireActual(
    "@/features/product-feedback/api/featureRequestsClient",
  );

  return {
    ...actual,
    markFeatureRequestNotificationOpened: jest.fn().mockResolvedValue(undefined),
    markFeatureRequestNotificationClicked: jest.fn().mockResolvedValue(undefined),
    markFeatureRequestNotificationDelivered: jest.fn().mockResolvedValue(undefined),
  };
});

const mockFrom = supabase!.from as jest.Mock;
const mockTrack = trackProductFeedbackEvent as jest.Mock;
const mockMarkOpened = markFeatureRequestNotificationOpened as jest.Mock;
const mockMarkClicked = markFeatureRequestNotificationClicked as jest.Mock;
const mockMarkDelivered = markFeatureRequestNotificationDelivered as jest.Mock;

function buildRequest(overrides?: Partial<FeatureRequest>): FeatureRequest {
  return {
    id: "req-1",
    userId: "user-1",
    title: "Timeline filters",
    description: "Filter timeline entries by care type.",
    category: "Timeline",
    status: "submitted",
    plantId: null,
    contactPreference: "in_app",
    screenshotUrls: [],
    voteCount: 3,
    archived: false,
    mergedIntoId: null,
    releaseVersion: null,
    releaseNotes: null,
    createdAt: "2026-06-02T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    hasVoted: false,
    ...overrides,
  };
}

describe("feature request schemas", () => {
  it("accepts a valid submission payload", () => {
    const parsed = submitFeatureRequestSchema.parse({
      title: "Growth comparison slider",
      description:
        "It would help to compare plant progress side by side over time.",
      category: "Photos",
      contactPreference: "in_app",
      screenshotUrls: [],
    });

    expect(parsed.title).toBe("Growth comparison slider");
  });

  it("rejects overly short descriptions", () => {
    expect(() =>
      submitFeatureRequestSchema.parse({
        title: "Slider",
        description: "Too short",
        category: "Photos",
      }),
    ).toThrow();
  });
});

describe("feature request constants", () => {
  it("includes all required categories and statuses", () => {
    expect(FEATURE_REQUEST_CATEGORIES).toContain("Plant Care");
    expect(FEATURE_REQUEST_CATEGORIES).toContain("Accessibility");
    expect(FEATURE_REQUEST_STATUSES).toEqual([
      "submitted",
      "under_review",
      "planned",
      "in_progress",
      "released",
      "declined",
    ]);
  });
});

describe("featureRequestCacheService", () => {
  beforeEach(async () => {
    await clearFeatureRequestCache();
  });

  it("writes, reads, and filters cached requests by section", async () => {
    const requests = [
      buildRequest(),
      buildRequest({
        id: "req-2",
        title: "Dark mode polish",
        voteCount: 8,
        status: "released",
      }),
    ];

    await writeFeatureRequestCache({ requests, roadmap: [] });

    const popular = filterCachedRequestsBySection(requests, "popular", "user-1");
    expect(popular[0]?.id).toBe("req-2");

    const page = await buildCachedFeatureRequestPage({
      section: "popular",
      userId: "user-1",
    });
    expect(page?.requests[0]?.id).toBe("req-2");
  });

  it("upserts a cached request by id for offline detail viewing", async () => {
    await upsertCachedFeatureRequest(buildRequest());
    const cached = (await readFeatureRequestCache())?.requestsById["req-1"];
    expect(cached?.title).toBe("Timeline filters");
  });
});

describe("optimistic vote updates", () => {
  it("increments and decrements vote counts locally", () => {
    const request = buildRequest({ voteCount: 2, hasVoted: false });

    expect(
      applyOptimisticFeatureRequestVote({ request, action: "vote" }).voteCount,
    ).toBe(3);
    expect(
      applyOptimisticFeatureRequestVote({
        request: { ...request, hasVoted: true, voteCount: 3 },
        action: "unvote",
      }).voteCount,
    ).toBe(2);
  });
});

describe("featureRequestStatusPresentation", () => {
  it("provides accessible labels for every status", () => {
    for (const status of FEATURE_REQUEST_STATUSES) {
      const presentation = getFeatureRequestStatusPresentation(status);
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.accessibilityLabel.length).toBeGreaterThan(0);
      expect(presentation.icon.length).toBeGreaterThan(0);
    }
  });

  it("formats request dates consistently", () => {
    expect(formatFeatureRequestDate("2026-06-02T12:00:00.000Z")).toContain("2026");
  });
});

describe("featureRequestsClient voting semantics", () => {
  it("documents duplicate vote prevention at the database layer", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260602120000_feature_requests.sql",
      ),
      "utf8",
    );

    expect(source).toContain("UNIQUE (request_id, user_id)");
    expect(source).toContain("sync_feature_request_vote_count");
  });

  it("surfaces duplicate vote errors from Supabase", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        error: { code: "23505", message: "duplicate key value" },
      }),
    });

    await expect(
      voteFeatureRequest({ requestId: "req-1", userId: "user-1" }),
    ).rejects.toThrow("already supported");
  });
});

describe("notification analytics lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tracks opened and clicked notification events separately", async () => {
    await recordFeatureRequestNotificationOpened("note-1");
    await recordFeatureRequestNotificationClicked("note-1", "req-1");

    expect(mockMarkOpened).toHaveBeenCalledWith("note-1");
    expect(mockMarkClicked).toHaveBeenCalledWith("note-1");
    expect(mockTrack).toHaveBeenCalledWith(
      "feature_request_notification_opened",
      { notificationId: "note-1" },
    );
    expect(mockTrack).toHaveBeenCalledWith(
      "feature_request_notification_clicked",
      { notificationId: "note-1", requestId: "req-1" },
    );
  });

  it("marks notifications delivered without setting opened_at", async () => {
    await mockMarkDelivered("note-1");
    expect(mockMarkDelivered).toHaveBeenCalledWith("note-1");
  });
});

describe("profile feature request entry", () => {
  it("registers the Request a Feature profile row", () => {
    const source = require("fs").readFileSync(
      require("path").join(process.cwd(), "app", "profile.tsx"),
      "utf8",
    );

    expect(source).toContain('label="Request a Feature"');
    expect(source).toContain('"/feature-requests" as Href');
  });
});

describe("trackFeatureRequestStatusView", () => {
  it("emits status viewed analytics", () => {
    trackFeatureRequestStatusView("req-1", "planned");
    expect(mockTrack).toHaveBeenCalledWith("feature_request_status_viewed", {
      requestId: "req-1",
      status: "planned",
    });
  });
});

describe("manage-feature-requests edge function", () => {
  it("requires admin secret and supports release notifications", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        process.cwd(),
        "supabase",
        "functions",
        "manage-feature-requests",
        "index.ts",
      ),
      "utf8",
    );

    expect(source).toContain("FEATURE_REQUEST_ADMIN_SECRET");
    expect(source).toContain("notifyReleaseStakeholders");
    expect(source).toContain('action: "update_status"');
    expect(source).toContain('action: "merge_requests"');
  });
});

import {
  trackEmptyStateActionTapped,
  trackEmptyStateFilterCleared,
  trackEmptyStateRetryTapped,
  trackEmptyStateViewed,
} from "@/features/empty-states/analytics";
import { trackEvent } from "@/services/analytics/analyticsService";

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

describe("empty state analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tracks viewed events", () => {
    trackEmptyStateViewed({
      screen: "library",
      empty_state_type: "firstRun",
      reason: "no_plants",
      analytics_key: "library_no_plants",
    });

    expect(trackEvent).toHaveBeenCalledWith("empty_state_viewed", {
      screen: "library",
      empty_state_type: "firstRun",
      reason: "no_plants",
      analytics_key: "library_no_plants",
    });
  });

  it("tracks action, filter clear, and retry events", () => {
    trackEmptyStateActionTapped({
      screen: "library",
      empty_state_type: "filtered",
      reason: "search",
      action: "clear_search",
      analytics_key: "library_search_empty",
    });
    trackEmptyStateFilterCleared({
      screen: "library",
      empty_state_type: "filtered",
      reason: "filter",
      analytics_key: "library_filter_empty",
    });
    trackEmptyStateRetryTapped({
      screen: "highlights",
      empty_state_type: "error",
      reason: "query_error",
      analytics_key: "highlights_error",
    });

    expect(trackEvent).toHaveBeenCalledWith("empty_state_action_tapped", expect.any(Object));
    expect(trackEvent).toHaveBeenCalledWith("empty_state_filter_cleared", expect.any(Object));
    expect(trackEvent).toHaveBeenCalledWith("empty_state_retry_tapped", expect.any(Object));
  });
});

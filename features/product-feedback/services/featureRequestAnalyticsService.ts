import { trackEvent } from "@/services/analytics/analyticsService";

export type ProductFeedbackAnalyticsEvent =
  | "feature_request_opened"
  | "feature_request_submitted"
  | "feature_request_voted"
  | "feature_request_removed_vote"
  | "feature_request_status_viewed"
  | "roadmap_viewed"
  | "released_feature_opened"
  | "feature_request_notification_delivered"
  | "feature_request_notification_opened"
  | "feature_request_notification_clicked"
  | "feature_request_search"
  | "feature_request_duplicate_suggested"
  | "released_feature_feedback"
  | "beta_program_opt_in";

export function trackProductFeedbackEvent(
  name: ProductFeedbackAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
) {
  trackEvent(name, properties);
}

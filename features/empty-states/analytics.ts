import { trackEvent } from "@/services/analytics/analyticsService";

import type { EmptyStateTone } from "./types";

export function trackEmptyStateViewed(properties: {
  screen: string;
  empty_state_type: EmptyStateTone;
  reason: string;
  analytics_key: string;
}): void {
  trackEvent("empty_state_viewed", properties);
}

export function trackEmptyStateActionTapped(properties: {
  screen: string;
  empty_state_type: EmptyStateTone;
  reason: string;
  action: string;
  analytics_key: string;
}): void {
  trackEvent("empty_state_action_tapped", properties);
}

export function trackEmptyStateFilterCleared(properties: {
  screen: string;
  empty_state_type: EmptyStateTone;
  reason: string;
  analytics_key: string;
}): void {
  trackEvent("empty_state_filter_cleared", properties);
}

export function trackEmptyStateRetryTapped(properties: {
  screen: string;
  empty_state_type: EmptyStateTone;
  reason: string;
  analytics_key: string;
}): void {
  trackEvent("empty_state_retry_tapped", properties);
}

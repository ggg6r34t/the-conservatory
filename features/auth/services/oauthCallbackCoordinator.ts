import {
  completeOAuthCallbackFromUrl,
  isOAuthCallbackUrl,
} from "@/features/auth/services/oauthCallback";
import { trackEvent } from "@/services/analytics/analyticsService";
import { logger } from "@/utils/logger";

const exchangeInflight = new Map<string, Promise<boolean>>();
const completedExchanges = new Set<string>();

export function resetOAuthCallbackCoordinatorForTests() {
  exchangeInflight.clear();
  completedExchanges.clear();
}

export function hasCompletedOAuthCallback(url: string) {
  return completedExchanges.has(url);
}

/**
 * Exchanges an OAuth callback URL for a Supabase session exactly once per URL.
 * Concurrent callers for the same URL share one in-flight exchange.
 */
export async function exchangeOAuthCallbackUrl(url: string): Promise<boolean> {
  if (!isOAuthCallbackUrl(url)) {
    return false;
  }

  if (completedExchanges.has(url)) {
    return true;
  }

  const inflight = exchangeInflight.get(url);
  if (inflight) {
    return inflight;
  }

  const exchangePromise = (async () => {
    trackEvent("oauth_callback_received", {
      provider: "unknown",
      screen: "callback",
      reason_code: "callback_received",
    });

    try {
      await completeOAuthCallbackFromUrl(url);
      completedExchanges.add(url);
      return true;
    } catch (error) {
      logger.warn("auth.oauth.callback_failed");
      throw error;
    } finally {
      exchangeInflight.delete(url);
    }
  })();

  exchangeInflight.set(url, exchangePromise);
  return exchangePromise;
}

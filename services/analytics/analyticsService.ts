import { env } from "@/config/env";
import { logger } from "@/utils/logger";

export type AnalyticsMode = "disabled" | "debug-log";

export function getAnalyticsMode(): AnalyticsMode {
  if (!env.enableAnalytics) {
    return "disabled";
  }

  return "debug-log";
}

export function getAnalyticsStatus() {
  const mode = getAnalyticsMode();

  return {
    mode,
    productionReady: false,
    description:
      mode === "disabled"
        ? "Analytics transport is intentionally disabled for this release."
        : "Analytics is running in debug-log mode and does not send events to a production analytics provider.",
  };
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const mode = getAnalyticsMode();

  if (mode === "disabled") {
    return;
  }

  logger.info("analytics.debug_event", {
    name,
    properties,
    mode,
    productionReady: false,
  });
}

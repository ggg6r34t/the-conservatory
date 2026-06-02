import * as Sentry from "@sentry/react-native";

import { env } from "@/config/env";
import { trackEvent } from "@/services/analytics/analyticsService";

export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  properties?: Record<string, string | number | boolean | null>,
): Promise<T> {
  const startedAt = Date.now();

  const run = async () => {
    try {
      return await operation();
    } finally {
      const durationMs = Date.now() - startedAt;
      trackEvent("performance_span", {
        name,
        duration_ms: durationMs,
        ...properties,
      });
    }
  };

  if (!env.sentryDsn) {
    return run();
  }

  return Sentry.startSpan({ name, op: "app.task" }, run);
}

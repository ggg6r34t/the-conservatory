import type { ComponentType } from "react";

import { env } from "@/config/env";
import { logger } from "@/utils/logger";

import { getSentryRuntime, wrapWithSentryRuntime } from "./sentryRuntime";

export type CrashReportingMode = "disabled" | "active";

let initialized = false;

export function getCrashReportingMode(): CrashReportingMode {
  return env.sentryDsn ? "active" : "disabled";
}

export function initializeCrashReporting() {
  const Sentry = getSentryRuntime();
  if (initialized || !Sentry) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn!,
    enabled: true,
    debug: __DEV__,
    tracesSampleRate: env.isProductionBuild ? 0.2 : 1,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
  });

  initialized = true;
  logger.info("observability.crash_reporting_initialized", {
    mode: getCrashReportingMode(),
  });
}

export function setCrashReportingUser(user: { id: string; email?: string | null }) {
  const Sentry = getSentryRuntime();
  if (!Sentry) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
}

export function clearCrashReportingUser() {
  const Sentry = getSentryRuntime();
  if (!Sentry) {
    return;
  }

  Sentry.setUser(null);
}

export function captureException(
  error: unknown,
  context?: Record<string, string | number | boolean | null>,
) {
  const Sentry = getSentryRuntime();
  if (!Sentry) {
    if (__DEV__) {
      logger.warn("observability.crash_reporting_skipped", {
        message: error instanceof Error ? error.message : String(error),
        ...context,
      });
    }
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function wrapWithCrashReporting<T extends ComponentType<unknown>>(
  component: T,
) {
  return wrapWithSentryRuntime(component);
}

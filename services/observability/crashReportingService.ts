import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";

import { env } from "@/config/env";
import { logger } from "@/utils/logger";

export type CrashReportingMode = "disabled" | "active";

let initialized = false;

export function getCrashReportingMode(): CrashReportingMode {
  return env.sentryDsn ? "active" : "disabled";
}

export function initializeCrashReporting() {
  if (initialized || !env.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
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
  if (getCrashReportingMode() !== "active") {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
}

export function clearCrashReportingUser() {
  if (getCrashReportingMode() !== "active") {
    return;
  }

  Sentry.setUser(null);
}

export function captureException(
  error: unknown,
  context?: Record<string, string | number | boolean | null>,
) {
  if (getCrashReportingMode() !== "active") {
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
  if (getCrashReportingMode() !== "active") {
    return component;
  }

  return Sentry.wrap(component);
}

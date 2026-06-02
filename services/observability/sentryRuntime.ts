import type { ComponentType } from "react";

import { env } from "@/config/env";

type SentryModule = typeof import("@sentry/react-native");

let sentryModule: SentryModule | null | undefined;

function loadSentry(): SentryModule | null {
  if (!env.sentryDsn) {
    return null;
  }

  if (sentryModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sentryModule = require("@sentry/react-native") as SentryModule;
    } catch {
      sentryModule = null;
    }
  }

  return sentryModule;
}

export function getSentryRuntime() {
  return loadSentry();
}

export function wrapWithSentryRuntime<T extends ComponentType<unknown>>(
  component: T,
): T {
  const Sentry = loadSentry();
  if (!Sentry) {
    return component;
  }

  return Sentry.wrap(component) as T;
}

import type { OnboardingStatus } from "@/features/onboarding/services/onboardingStorage";

export type EntryRedirectTarget = "/" | "/(auth)/login" | "/(tabs)" | "/plant/add";

const ALLOWED_AUTH_REDIRECTS: EntryRedirectTarget[] = ["/(tabs)", "/plant/add"];

export function resolveSafeAuthRedirectTarget(
  redirectTo?: string | string[] | null,
): EntryRedirectTarget {
  if (typeof redirectTo !== "string") {
    return "/(tabs)";
  }

  return ALLOWED_AUTH_REDIRECTS.includes(redirectTo as EntryRedirectTarget)
    ? (redirectTo as EntryRedirectTarget)
    : "/(tabs)";
}

export function resolveEntryRoute(input: {
  authStatus: "authenticated" | "anonymous";
  onboardingStatus: OnboardingStatus;
}) {
  if (input.authStatus === "authenticated") {
    return "/(tabs)" as const;
  }

  if (input.onboardingStatus === "completed") {
    return "/(auth)/login" as const;
  }

  return "/" as const;
}

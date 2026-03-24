import { env } from "@/config/env";
import { supabase } from "@/config/supabase";

export type BackendConfigurationMode =
  | "cloud"
  | "local-development"
  | "release-misconfigured";

export type RemoteBackendAvailabilityState =
  | "local-only"
  | "available"
  | "unavailable";

export interface BackendConfigurationSummary {
  mode: BackendConfigurationMode;
  isSupabaseConfigured: boolean;
  authActionsEnabled: boolean;
  requiresReleaseConfig: boolean;
  title: string;
  description: string;
  missingConfig: string[];
}

export interface RemoteBackendAvailability {
  state: RemoteBackendAvailabilityState;
  canSync: boolean;
  title: string;
  description: string;
  detail?: string;
}

export function getBackendConfigurationSummary(): BackendConfigurationSummary {
  if (env.isSupabaseConfigured && supabase) {
    return {
      mode: "cloud",
      isSupabaseConfigured: true,
      authActionsEnabled: true,
      requiresReleaseConfig: false,
      title: "Supabase connected",
      description:
        "Authentication and remote sync are configured for this build, with local storage kept in step for offline access.",
      missingConfig: [],
    };
  }

  if (env.isProductionBuild) {
    return {
      mode: "release-misconfigured",
      isSupabaseConfigured: false,
      authActionsEnabled: false,
      requiresReleaseConfig: true,
      title: "Supabase configuration required",
      description:
        "This release build is missing required Supabase environment configuration. Sign-in, password recovery, and remote backup should not be treated as available until those values are supplied.",
      missingConfig: env.missingSupabaseConfig,
    };
  }

  return {
    mode: "local-development",
    isSupabaseConfigured: false,
    authActionsEnabled: true,
    requiresReleaseConfig: false,
    title: "Local development mode",
    description:
      "Supabase is not configured, so this build uses local-only development fallbacks instead of production authentication or cloud backup.",
    missingConfig: env.missingSupabaseConfig,
  };
}

export async function probeRemoteBackendAvailability(): Promise<RemoteBackendAvailability> {
  const configuration = getBackendConfigurationSummary();

  if (!configuration.isSupabaseConfigured || !supabase) {
    return {
      state: "local-only",
      canSync: false,
      title:
        configuration.mode === "local-development"
          ? "Local device only"
          : "Remote backup unavailable",
      description:
        configuration.mode === "local-development"
          ? "Your conservatory is currently stored only on this device. Remote backup and hydration are disabled until Supabase is configured."
          : "This build does not currently have a usable Supabase backend, so remote backup cannot run.",
      detail:
        configuration.missingConfig.length > 0
          ? `Missing configuration: ${configuration.missingConfig.join(", ")}`
          : undefined,
    };
  }

  if (!env.enableSyncTrials) {
    return {
      state: "unavailable",
      canSync: false,
      title: "Remote sync disabled",
      description:
        "Supabase is configured, but remote sync is not enabled for this build yet. Your conservatory remains stored locally until sync is explicitly turned on.",
      detail:
        "Set EXPO_PUBLIC_ENABLE_SYNC_TRIALS=true to enable remote sync processing.",
    };
  }

  try {
    const { error } = await supabase.auth.getUser();

    if (error) {
      return {
        state: "unavailable",
        canSync: false,
        title: "Sync infrastructure unavailable",
        description:
          "Supabase is configured for this build, but the service is not responding cleanly right now. Local data remains available on this device.",
        detail: error.message,
      };
    }

    return {
      state: "available",
      canSync: true,
      title: "Remote backup available",
      description:
        "Supabase is configured and reachable, so your sync queue can be pushed and remote records can be hydrated into local storage.",
    };
  } catch (error) {
    return {
      state: "unavailable",
      canSync: false,
      title: "Sync infrastructure unavailable",
      description:
        "Supabase is configured for this build, but the service could not be reached just now. Local data remains available on this device.",
      detail: error instanceof Error ? error.message : "Unknown backend error.",
    };
  }
}

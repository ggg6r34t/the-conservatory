import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import type {
  CurateArchiveGalleryRequest,
  CurateArchiveGalleryResponse,
  GenerateDashboardInsightRequest,
  GenerateDashboardInsightResponse,
  GenerateHealthInsightRequest,
  GenerateHealthInsightResponse,
  GenerateCareScheduleRequest,
  GenerateCareScheduleResponse,
  GenerateJournalSummaryRequest,
  GenerateJournalSummaryResponse,
  GenerateStreakNudgeRequest,
  GenerateStreakNudgeResponse,
  IdentifyPlantRequest,
  IdentifyPlantResponse,
  OptimizeRemindersRequest,
  OptimizeRemindersResponse,
  RefineCareLogRequest,
  RefineCareLogResponse,
} from "@/features/ai/types/ai";
import { FEATURE_REQUIRES_PREMIUM } from "@/features/billing/constants";
import type { GatedFeature } from "@/features/billing/types";
import { getEntitlementState } from "@/services/entitlementState";
import { logger } from "@/utils/logger";

export type EdgeFunctionErrorCode =
  | "auth_required"
  | "validation_error"
  | "premium_required"
  | "quota_exceeded"
  | "rate_limit_exceeded"
  | "payload_too_large"
  | "server_error";

type EdgeFunctionErrorPayload = {
  error?: {
    code?: EdgeFunctionErrorCode;
    message?: string;
    details?: Record<string, unknown>;
  };
};

const AI_FUNCTION_FEATURES: Record<string, GatedFeature> = {
  "identify-plant": "ai_species_identification",
  "generate-dashboard-insight": "ai_dashboard_editorial",
  "generate-health-insight": "ai_health_insight",
  "generate-journal-summary": "ai_journal_narrative",
  "optimize-reminders": "smart_reminder_optimization",
  "refine-care-log": "ai_health_insight",
  "curate-archive-gallery": "ai_archive_curation",
  "generate-streak-nudge": "ai_health_insight",
  "generate-care-schedule": "ai_care_schedule",
};

function getEdgeErrorCode(data: unknown): EdgeFunctionErrorCode | null {
  const payload = data as EdgeFunctionErrorPayload | null;
  const code = payload?.error?.code;
  if (
    code === "auth_required" ||
    code === "validation_error" ||
    code === "premium_required" ||
    code === "quota_exceeded" ||
    code === "rate_limit_exceeded" ||
    code === "payload_too_large" ||
    code === "server_error"
  ) {
    return code;
  }
  return null;
}

function logEdgeFunctionDenial(
  name: string,
  code: EdgeFunctionErrorCode | null,
) {
  logger.warn("ai.function.invoke_denied", {
    name,
    code: code ?? "network_or_unknown",
  });
}

async function invokeFunction<TRequest, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse | null> {
  if (!env.isSupabaseConfigured || !supabase) {
    return null;
  }

  const feature = AI_FUNCTION_FEATURES[name];
  const isPremium = getEntitlementState();
  if (feature && FEATURE_REQUIRES_PREMIUM[feature] && !isPremium) {
    logger.warn("ai.function.blocked_by_entitlement", { name, feature });
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body: {
        ...(payload as Record<string, unknown>),
        billingContext: feature
          ? {
              feature,
              isPremium,
            }
          : undefined,
      },
    });

    if (error) {
      logEdgeFunctionDenial(name, getEdgeErrorCode(data));
      return null;
    }

    const edgeErrorCode = getEdgeErrorCode(data);
    if (edgeErrorCode) {
      logEdgeFunctionDenial(name, edgeErrorCode);
      return null;
    }

    return (data as TResponse | null) ?? null;
  } catch (error) {
    logger.warn("ai.function.invoke_failed", {
      name,
      code: "network_or_unknown",
    });
    return null;
  }
}

export function requestPlantIdentification(input: IdentifyPlantRequest) {
  return invokeFunction<IdentifyPlantRequest, IdentifyPlantResponse>(
    "identify-plant",
    input,
  );
}

export function requestDashboardInsight(
  input: GenerateDashboardInsightRequest,
) {
  return invokeFunction<
    GenerateDashboardInsightRequest,
    GenerateDashboardInsightResponse
  >("generate-dashboard-insight", input);
}

export function requestHealthInsight(input: GenerateHealthInsightRequest) {
  return invokeFunction<
    GenerateHealthInsightRequest,
    GenerateHealthInsightResponse
  >("generate-health-insight", input);
}

export function requestJournalSummary(input: GenerateJournalSummaryRequest) {
  return invokeFunction<
    GenerateJournalSummaryRequest,
    GenerateJournalSummaryResponse
  >("generate-journal-summary", input);
}

export function requestReminderOptimization(input: OptimizeRemindersRequest) {
  return invokeFunction<OptimizeRemindersRequest, OptimizeRemindersResponse>(
    "optimize-reminders",
    input,
  );
}

export function requestCareLogRefinement(input: RefineCareLogRequest) {
  return invokeFunction<RefineCareLogRequest, RefineCareLogResponse>(
    "refine-care-log",
    input,
  );
}

export function requestArchiveCuration(input: CurateArchiveGalleryRequest) {
  return invokeFunction<
    CurateArchiveGalleryRequest,
    CurateArchiveGalleryResponse
  >("curate-archive-gallery", input);
}

export function requestCareScheduleSuggestions(
  input: GenerateCareScheduleRequest,
) {
  return invokeFunction<
    GenerateCareScheduleRequest,
    GenerateCareScheduleResponse
  >("generate-care-schedule", input);
}

export function requestStreakNudge(input: GenerateStreakNudgeRequest) {
  return invokeFunction<
    GenerateStreakNudgeRequest,
    GenerateStreakNudgeResponse
  >("generate-streak-nudge", input);
}

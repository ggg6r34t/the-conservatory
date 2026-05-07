import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { FEATURE_REQUIRES_PREMIUM } from "@/features/billing/constants";
import type { GatedFeature } from "@/features/billing/types";
import type {
  CurateArchiveGalleryRequest,
  CurateArchiveGalleryResponse,
  GenerateDashboardInsightRequest,
  GenerateDashboardInsightResponse,
  GenerateHealthInsightRequest,
  GenerateHealthInsightResponse,
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
import { logger } from "@/utils/logger";
import { getEntitlementState } from "@/services/entitlementState";

const AI_FUNCTION_FEATURES: Record<string, GatedFeature> = {
  "identify-plant": "ai_species_identification",
  "generate-dashboard-insight": "ai_dashboard_editorial",
  "generate-health-insight": "ai_health_insight",
  "generate-journal-summary": "ai_journal_narrative",
  "optimize-reminders": "smart_reminder_optimization",
  "refine-care-log": "ai_health_insight",
  "curate-archive-gallery": "ai_archive_curation",
  "generate-streak-nudge": "ai_health_insight",
};

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
      logger.warn("ai.function.invoke_failed", {
        name,
        message: error.message,
      });
      return null;
    }

    return (data as TResponse | null) ?? null;
  } catch (error) {
    logger.warn("ai.function.invoke_failed", {
      name,
      message: error instanceof Error ? error.message : "unknown",
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

export function requestDashboardInsight(input: GenerateDashboardInsightRequest) {
  return invokeFunction<
    GenerateDashboardInsightRequest,
    GenerateDashboardInsightResponse
  >("generate-dashboard-insight", input);
}

export function requestHealthInsight(input: GenerateHealthInsightRequest) {
  return invokeFunction<GenerateHealthInsightRequest, GenerateHealthInsightResponse>(
    "generate-health-insight",
    input,
  );
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
  return invokeFunction<CurateArchiveGalleryRequest, CurateArchiveGalleryResponse>(
    "curate-archive-gallery",
    input,
  );
}

export function requestStreakNudge(input: GenerateStreakNudgeRequest) {
  return invokeFunction<GenerateStreakNudgeRequest, GenerateStreakNudgeResponse>(
    "generate-streak-nudge",
    input,
  );
}

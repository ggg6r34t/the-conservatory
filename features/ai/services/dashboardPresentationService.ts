import type { DashboardInsight, StreakRecoveryNudge } from "@/features/ai/types/ai";

export interface DashboardPresentationState {
  primaryInsight: DashboardInsight | null;
  streakNudge: StreakRecoveryNudge | null;
}

export function decideDashboardPresentation(input: {
  insight: DashboardInsight | null;
  streakNudge: StreakRecoveryNudge | null;
}): DashboardPresentationState {
  if (input.insight) {
    return {
      primaryInsight: input.insight,
      streakNudge: null,
    };
  }

  return {
    primaryInsight: null,
    streakNudge: input.streakNudge,
  };
}

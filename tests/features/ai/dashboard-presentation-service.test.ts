import { decideDashboardPresentation } from "@/features/ai/services/dashboardPresentationService";
import type { DashboardInsight, StreakRecoveryNudge } from "@/features/ai/types/ai";

describe("dashboardPresentationService", () => {
  it("prefers the primary insight when both insight and nudge are available", () => {
    const insight: DashboardInsight = {
      title: "Today in your conservatory",
      body: "Aster is ready for care.",
      source: "local",
    };
    const nudge: StreakRecoveryNudge = {
      body: "A light check-in today should be enough.",
      source: "local",
    };

    const result = decideDashboardPresentation({ insight, streakNudge: nudge });

    expect(result.primaryInsight).toEqual(insight);
    expect(result.streakNudge).toBeNull();
  });

  it("shows the streak nudge when no stronger insight exists", () => {
    const nudge: StreakRecoveryNudge = {
      body: "A light check-in today should be enough.",
      source: "local",
    };

    const result = decideDashboardPresentation({ insight: null, streakNudge: nudge });

    expect(result.primaryInsight).toBeNull();
    expect(result.streakNudge).toEqual(nudge);
  });
});

import { enforceHealthInsightSafety } from "@/features/ai/services/healthInsightSafetyService";
import type { HealthSignalAnalysis } from "@/features/ai/services/healthSignalAnalysisService";

function createAnalysis(
  overrides?: Partial<HealthSignalAnalysis>,
): HealthSignalAnalysis {
  return {
    classification: "dryness",
    confidence: 0.78,
    signalSummary: {
      photoHistoryCount: 3,
      recentPhotoCount: 2,
      recentLogCount: 2,
      daysBetweenLatestPhotos: 10,
      daysSinceLatestPhoto: 2,
      daysSinceLastWater: 8,
      careRhythm: "overdue",
      contradictionCount: 0,
      dominantSignal: "dryness",
    },
    localInsight: null,
    ...overrides,
  };
}

describe("healthInsightSafetyService", () => {
  it("allows hedged observational language above threshold", () => {
    const result = enforceHealthInsightSafety({
      analysis: createAnalysis(),
      insight: {
        title: "Anything",
        body: "Recent photos suggest mild dryness along the leaf edges.",
        confidence: 0.78,
      },
    });

    expect(result?.title).toBe("Health insight");
  });

  it("rejects absolute diagnostic language", () => {
    const result = enforceHealthInsightSafety({
      analysis: createAnalysis(),
      insight: {
        title: "Health insight",
        body: "Your plant definitely has a fungal problem.",
        confidence: 0.9,
      },
    });

    expect(result).toBeNull();
  });

  it("suppresses low-confidence non-stable claims", () => {
    const result = enforceHealthInsightSafety({
      analysis: createAnalysis({ confidence: 0.61 }),
      insight: {
        title: "Health insight",
        body: "Leaf edges may be showing mild dryness.",
        confidence: 0.61,
      },
    });

    expect(result).toBeNull();
  });
});

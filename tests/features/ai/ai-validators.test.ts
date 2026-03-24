import {
  parseArchiveCurationResponse,
  parseDashboardInsightResponse,
  parseHealthInsightResponse,
  parseJournalSummaryResponse,
  parseRefinedCareLogResponse,
  parseReminderOptimizationResponse,
  parseSpeciesSuggestionResponse,
  parseStreakNudgeResponse,
} from "@/features/ai/schemas/aiValidators";

describe("aiValidators", () => {
  it("parses species suggestions safely", () => {
    const result = parseSpeciesSuggestionResponse({
      suggestion: {
        species: "monstera deliciosa",
        confidence: 0.8,
        source: "cloud",
      },
    });

    expect(result?.species).toBe("Monstera Deliciosa");
  });

  it("returns null for invalid dashboard responses", () => {
    const result = parseDashboardInsightResponse({
      insight: { title: "", body: "" },
    });

    expect(result).toBeNull();
  });

  it("parses journal summaries", () => {
    const result = parseJournalSummaryResponse({
      summary: {
        title: "Monthly reflection",
        body: "The collection stayed steady this month.",
      },
    });

    expect(result?.title).toBe("Monthly reflection");
  });

  it("parses reminder optimization payloads", () => {
    const result = parseReminderOptimizationResponse({
      result: {
        nextDueAt: "2026-03-31T09:00:00.000Z",
        explanation: "Adjusted based on recent care.",
        shouldSchedule: true,
      },
    });

    expect(result?.shouldSchedule).toBe(true);
  });

  it("parses cautious health insights", () => {
    const result = parseHealthInsightResponse({
      insight: {
        title: "Health insight",
        body: "Recent photos suggest stable condition.",
        confidence: 0.72,
        classification: "stable",
        signalSummary: {
          photoHistoryCount: 3,
          recentPhotoCount: 2,
          recentLogCount: 2,
          daysBetweenLatestPhotos: 10,
          daysSinceLatestPhoto: 1,
          daysSinceLastWater: 6,
          careRhythm: "steady",
          contradictionCount: 0,
          dominantSignal: "stable",
        },
      },
    });

    expect(result?.confidence).toBe(0.72);
    expect(result?.classification).toBe("stable");
  });

  it("parses refined care log suggestions", () => {
    const result = parseRefinedCareLogResponse({
      suggestion: {
        refinedNote: "Checked leaves and wiped dust.",
        suggestedTags: ["stable condition", "new growth"],
      },
    });

    expect(result?.suggestedTags).toHaveLength(2);
  });

  it("parses curated archive pairs", () => {
    const result = parseArchiveCurationResponse({
      pairs: [
        {
          plantId: "plant-1",
          plantName: "Juniper",
          beforeUri: "file://before.jpg",
          afterUri: "file://after.jpg",
          caption: "Earlier and later moments, held together in the archive.",
        },
      ],
    });

    expect(result).toHaveLength(1);
  });

  it("parses streak nudges", () => {
    const result = parseStreakNudgeResponse({
      nudge: {
        body: "A brief check-in today could help keep your rhythm steady.",
      },
    });

    expect(result?.body).toContain("rhythm steady");
  });
});

import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("revenue funnel analytics wiring", () => {
  it("tracks cloud AI usage across premium AI services", () => {
    const sources = [
      "features/ai/services/healthInsightService.ts",
      "features/ai/services/plantIntelligenceService.ts",
      "features/ai/services/dashboardInsightService.ts",
      "features/ai/services/journalSummaryService.ts",
      "features/ai/services/archiveCurationService.ts",
    ];

    for (const sourcePath of sources) {
      expect(read(sourcePath)).toContain('trackAiFeatureUsed("');
    }
  });

  it("tracks export and premium funnel events", () => {
    expect(read("features/export/hooks/useExportCollectionData.ts")).toContain(
      "export_collection_started",
    );
    expect(read("features/export/hooks/useExportCollectionData.ts")).toContain(
      "export_collection_completed",
    );
    expect(read("app/premium.tsx")).toContain('premium_screen_viewed');
    expect(read("app/subscription-plans.tsx")).toContain("purchase_completed");
  });

  it("tracks species quota exhaustion in the species hook", () => {
    expect(read("features/ai/hooks/useSpeciesSuggestion.ts")).toContain(
      'quota_reached',
    );
    expect(read("features/ai/hooks/useSpeciesSuggestion.ts")).toContain(
      "ai_species_identification",
    );
  });
});

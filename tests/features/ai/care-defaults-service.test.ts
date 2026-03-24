import { buildCareDefaults } from "@/features/ai/services/careDefaultsService";

describe("careDefaultsService", () => {
  it("builds species-aware defaults for monstera in indirect light", () => {
    const result = buildCareDefaults({
      speciesName: "Monstera Deliciosa",
      lightCondition: "indirect",
    });

    expect(result.wateringIntervalDays).toBe(8);
    expect(result.lightSummary).toContain("Bright indirect");
  });

  it("extends the interval in low light", () => {
    const result = buildCareDefaults({
      speciesName: "Pothos",
      lightCondition: "low",
    });

    expect(result.wateringIntervalDays).toBe(10);
  });

  it("stays restrained for low-confidence suggestions", () => {
    const result = buildCareDefaults({
      speciesName: "Fiddle Leaf Fig",
      lightCondition: "direct",
      acceptedSuggestion: {
        species: "Fiddle Leaf Fig",
        confidence: 0.5,
        source: "local",
      },
    });

    expect(result.wateringIntervalDays).toBeGreaterThanOrEqual(6);
    expect(result.wateringIntervalDays).toBeLessThanOrEqual(10);
    expect(result.explanation).toContain("tentative");
  });
});

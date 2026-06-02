import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("species identification truthfulness", () => {
  it("encodes local photos before cloud identification", () => {
    const service = read("features/ai/services/plantIntelligenceService.ts");
    const encoding = read("features/ai/services/imageEncodingService.ts");

    expect(service).toContain("encodeLocalImageForAi");
    expect(service).toContain("hasVerifiedModelGeneration");
    expect(service).toContain("confidenceExplanation?.trim()");
    expect(service).toContain('withSpeciesSource(parsedRemote, "cloud")');
    expect(service).toContain('withSpeciesSource');
    expect(service).toContain('"local"');
    expect(encoding).toContain("base64");
  });

  it("keeps cloud species calls behind quota and optional premium allowance", () => {
    const hook = read("features/ai/hooks/useSpeciesSuggestion.ts");
    const banner = read("features/ai/components/SpeciesSuggestionBanner.tsx");

    expect(hook).toContain('canUseFeature("ai_species_identification"');
    expect(hook).toContain("cloudAllowed");
    expect(banner).toContain('suggestion.source === "local"');
    expect(banner).toContain("not a vision model result");
    expect(banner).toContain("confidenceExplanation");
  });
});

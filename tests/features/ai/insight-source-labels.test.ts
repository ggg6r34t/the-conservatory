import {
  getInsightSourceLabel,
  getInsightSourceTone,
} from "@/features/ai/services/insightSourcePresentation";

describe("insight source presentation", () => {
  it("uses calm truthful copy for cloud enhanced insights", () => {
    expect(getInsightSourceLabel("cloud")).toBe("Enhanced insight");
    expect(getInsightSourceTone("cloud")).toBe("enhanced");
  });

  it("uses calm truthful copy for local fallback insights", () => {
    expect(getInsightSourceLabel("local")).toBe("Generated locally");
    expect(getInsightSourceTone("local")).toBe("local");
  });
});

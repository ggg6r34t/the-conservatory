import {
  hasVerifiedModelGeneration,
  parseAiGenerationMeta,
} from "@/features/ai/schemas/aiGenerationMeta";

describe("aiGenerationMeta", () => {
  it("detects verified model generation when meta is present", () => {
    const payload = {
      insight: { title: "A", body: "B" },
      meta: {
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: 1200,
        inputTokens: 100,
        outputTokens: 40,
      },
    };

    expect(hasVerifiedModelGeneration(payload)).toBe(true);
    expect(parseAiGenerationMeta(payload)?.provider).toBe("openai");
  });

  it("rejects payloads without meta", () => {
    expect(hasVerifiedModelGeneration({ insight: { title: "A", body: "B" } })).toBe(
      false,
    );
    expect(hasVerifiedModelGeneration(null)).toBe(false);
  });
});

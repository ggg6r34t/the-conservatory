jest.mock("@/features/ai/api/aiClient", () => ({
  requestHealthInsight: jest.fn(),
  requestPlantIdentification: jest.fn(),
}));

jest.mock("@/features/ai/services/aiCache", () => ({
  getCachedValue: jest.fn(async () => null),
  setCachedValue: jest.fn(async () => {}),
}));

jest.mock("@/features/billing/services/usageClient", () => ({
  incrementUsage: jest.fn(async () => 1),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(async () => ({})),
}));

jest.mock("@/features/ai/services/healthInsightSafetyService", () => ({
  enforceHealthInsightSafety: jest.fn(({ insight }) => insight),
}));

jest.mock("@/features/ai/services/imageEncodingService", () => ({
  encodeLocalImageForAi: jest.fn(async () => ({
    imageBase64: "aGVsbG8=",
    mimeType: "image/jpeg",
  })),
}));

jest.mock("@/features/ai/services/healthSignalAnalysisService", () => ({
  buildHealthSignalAnalysis: jest.fn(() => ({
    localInsight: {
      title: "Local insight",
      body: "Looks okay from local signals.",
      confidence: 0.65,
      classification: "stable",
    },
    confidence: 0.65,
    classification: "stable",
    signalSummary: { daysSinceLastWater: 3 },
  })),
}));

import { requestHealthInsight, requestPlantIdentification } from "@/features/ai/api/aiClient";
import { incrementUsage } from "@/features/billing/services/usageClient";
import { getHealthInsight } from "@/features/ai/services/healthInsightService";
import { getSpeciesSuggestion } from "@/features/ai/services/plantIntelligenceService";
import type { PlantWithRelations } from "@/types/models";

const mockRequestHealthInsight = requestHealthInsight as jest.Mock;
const mockRequestPlantIdentification = requestPlantIdentification as jest.Mock;
const mockIncrementUsage = incrementUsage as jest.Mock;

const basePlant: PlantWithRelations = {
  plant: {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
  },
  photos: [],
  reminders: [],
  logs: [],
};

// Wrapped in { insight: ... } as required by parseHealthInsightResponse
const cloudHealthApiResponse = {
  insight: {
    title: "Cloud insight",
    body: "Cloud analysis differs from local.",
    confidence: 0.9,
    classification: "stable",
  },
  meta: {
    provider: "openai",
    model: "gpt-4o-mini",
    latencyMs: 900,
    inputTokens: 120,
    outputTokens: 60,
  },
};

describe("AI quota enforcement — health insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments usage when cloud AI returns a distinct result", async () => {
    mockRequestHealthInsight.mockResolvedValue(cloudHealthApiResponse);

    await getHealthInsight({
      plantId: "plant-1",
      data: basePlant,
      cloudAllowed: true,
      userId: "user-1",
    });

    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "ai_health_insight",
      { entityId: "plant-1" },
    );
  });

  it("does not increment when cloudAllowed is false (quota or free gate)", async () => {
    await getHealthInsight({
      plantId: "plant-1",
      data: basePlant,
      cloudAllowed: false,
      userId: "user-1",
    });

    expect(mockRequestHealthInsight).not.toHaveBeenCalled();
    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it("does not increment when no userId is provided", async () => {
    mockRequestHealthInsight.mockResolvedValue(cloudHealthApiResponse);

    await getHealthInsight({
      plantId: "plant-1",
      data: basePlant,
      cloudAllowed: true,
    });

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it("does not increment when cloud call throws", async () => {
    mockRequestHealthInsight.mockRejectedValue(new Error("Network error"));

    await expect(
      getHealthInsight({
        plantId: "plant-1",
        data: basePlant,
        cloudAllowed: true,
        userId: "user-1",
      }),
    ).rejects.toThrow("Network error");

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });
});

describe("AI quota enforcement — species identification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments usage when cloud returns a parsed species result", async () => {
    mockRequestPlantIdentification.mockResolvedValue({
      suggestion: {
        species: "Monstera Deliciosa",
        confidence: 0.95,
        careProfileHint: "Bright indirect light.",
        confidenceExplanation: "Split leaves and fenestrations visible.",
      },
      meta: {
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: 800,
      },
    });

    await getSpeciesSuggestion({
      imageUri: "file:///photo-unknown.jpg",
      cloudAllowed: true,
      userId: "user-1",
    });

    expect(mockIncrementUsage).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "ai_species_identification",
    );
  });

  it("does not increment when cloudAllowed is false", async () => {
    await getSpeciesSuggestion({
      imageUri: "file:///photo-unknown.jpg",
      cloudAllowed: false,
      userId: "user-1",
    });

    expect(mockRequestPlantIdentification).not.toHaveBeenCalled();
    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it("does not increment when cloud returns null (no match)", async () => {
    mockRequestPlantIdentification.mockResolvedValue(null);

    await getSpeciesSuggestion({
      imageUri: "file:///photo-unknown.jpg",
      cloudAllowed: true,
      userId: "user-1",
    });

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it("does not increment when cloud suggestion cannot be parsed", async () => {
    mockRequestPlantIdentification.mockResolvedValue({ suggestion: null });

    await getSpeciesSuggestion({
      imageUri: "file:///photo-unknown.jpg",
      cloudAllowed: true,
      userId: "user-1",
    });

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it("does not increment when no userId is provided", async () => {
    mockRequestPlantIdentification.mockResolvedValue({
      suggestion: { species: "Pothos", confidence: 0.88 },
      meta: { provider: "openai", model: "gpt-4o-mini", latencyMs: 700 },
    });

    await getSpeciesSuggestion({
      imageUri: "file:///photo-unknown.jpg",
      cloudAllowed: true,
    });

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });
});

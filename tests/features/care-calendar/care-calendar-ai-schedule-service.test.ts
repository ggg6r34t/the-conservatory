import { requestCareScheduleSuggestions } from "@/features/ai/api/aiClient";
import {
  buildLocalCareScheduleSuggestions,
  getCareScheduleSuggestions,
} from "@/features/care-calendar/services/careCalendarAiScheduleService";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import type { CareLog, CareReminder } from "@/types/models";

jest.mock("@/features/ai/services/aiCache", () => ({
  getCachedValue: jest.fn(async () => null),
  setCachedValue: jest.fn(async () => undefined),
}));

jest.mock("@/features/ai/api/aiClient", () => ({
  requestCareScheduleSuggestions: jest.fn(),
}));

const mockRequestCareScheduleSuggestions =
  requestCareScheduleSuggestions as jest.MockedFunction<
    typeof requestCareScheduleSuggestions
  >;

function createPlant(overrides?: Partial<PlantListItem>): PlantListItem {
  return {
    id: "plant-fern",
    userId: "user-1",
    name: "Fern",
    speciesName: "Boston Fern",
    status: "active",
    wateringIntervalDays: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

describe("care calendar AI schedule", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  beforeEach(() => {
    mockRequestCareScheduleSuggestions.mockReset();
  });

  it("suggests misting for humidity-loving species when no mist reminder exists", () => {
    const suggestions = buildLocalCareScheduleSuggestions({
      plants: [createPlant()],
      reminders: [],
      logs: [],
      now,
    });

    expect(suggestions.some((item) => item.careType === "mist")).toBe(true);
  });

  it("does not suggest mist when a mist reminder already exists", () => {
    const reminders: CareReminder[] = [
      {
        id: "reminder-mist",
        userId: "user-1",
        plantId: "plant-fern",
        reminderType: "mist",
        frequencyDays: 3,
        enabled: 1,
        nextDueAt: "2026-06-06T09:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        pending: 0,
      },
    ];

    const suggestions = buildLocalCareScheduleSuggestions({
      plants: [createPlant()],
      reminders,
      logs: [],
      now,
    });

    expect(suggestions.some((item) => item.careType === "mist")).toBe(false);
  });

  it("returns cloud suggestions when the edge response is verified", async () => {
    mockRequestCareScheduleSuggestions.mockResolvedValue({
      suggestions: [
        {
          plantId: "plant-fern",
          plantName: "Fern",
          careType: "prune",
          suggestedDueDate: "2026-06-10",
          frequencyDays: 14,
          confidence: "medium",
          reason: "Light seasonal trim may keep fronds even.",
        },
      ],
      meta: {
        provider: "openai",
        model: "gpt-4.1-mini",
        latencyMs: 1200,
        inputTokens: 100,
        outputTokens: 50,
      },
    });

    const result = await getCareScheduleSuggestions({
      userId: "user-1",
      plants: [createPlant()],
      reminders: [],
      logs: [],
      cloudAllowed: true,
      now,
    });

    expect(result.source).toBe("cloud");
    expect(result.suggestions.some((item) => item.careType === "prune")).toBe(
      true,
    );
    expect(mockRequestCareScheduleSuggestions).toHaveBeenCalled();
  });

  it("falls back to local suggestions when cloud is unavailable", async () => {
    mockRequestCareScheduleSuggestions.mockRejectedValue(
      new Error("network"),
    );

    const result = await getCareScheduleSuggestions({
      userId: "user-1",
      plants: [createPlant()],
      reminders: [],
      logs: [],
      cloudAllowed: true,
      now,
    });

    expect(result.source).toBe("local");
    expect(result.suggestions.some((item) => item.careType === "mist")).toBe(
      true,
    );
  });

  it("returns no suggestions when cloud is not allowed", async () => {
    const result = await getCareScheduleSuggestions({
      userId: "user-1",
      plants: [createPlant()],
      reminders: [],
      logs: [],
      cloudAllowed: false,
      now,
    });

    expect(result.suggestions).toEqual([]);
  });
});

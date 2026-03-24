import { requestJournalSummary } from "@/features/ai/api/aiClient";
import {
  buildJournalSummaryStateSignature,
  getJournalMonthlySummary,
} from "@/features/ai/services/journalSummaryService";
import type { CareLog, Plant } from "@/types/models";

jest.mock("@/features/ai/api/aiClient", () => ({
  requestJournalSummary: jest.fn(async ({ fallback }) => ({
    summary: fallback,
  })),
}));

jest.mock("@/features/ai/services/aiCache", () => {
  const store = new Map<string, unknown>();
  return {
    getCachedValue: jest.fn(async (key: string) =>
      store.has(key) ? store.get(key) : null,
    ),
  
  buildJournalSummaryStateSignature,
  getJournalMonthlySummary,
} from "@/features/ai/services/journalSummaryService";
import type { CareLog, Plant } from "@/types/models";

function createPlant(overrides?: Partial<Plant>): Plant {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Aster",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createLog(id: string, loggedAt: string): CareLog {
  return {
    id,
    userId: "user-1",
    plantId: "plant-1",
    logType: "water",
    loggedAt,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    pending: 0,
  };
}

describe("journalSummaryService cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("changes signature when recent care activity changes", () => {
    const first = buildJournalSummaryStateSignature({
      plants: [createPlant()],
      logs: [
        createLog("log-1", "2026-03-19T10:00:00.000Z"),
        createLog("log-2", "2026-03-18T10:00:00.000Z"),
      ],
      photoCount: 1,
    });
    const second = buildJournalSummaryStateSignature({
      plants: [createPlant({ updatedAt: "2026-03-24T08:00:00.000Z" })],
      logs: [
        createLog("log-1", "2026-03-24T08:00:00.000Z"),
        createLog("log-2", "2026-03-18T10:00:00.000Z"),
      ],
      photoCount: 1,
    });

    expect(first).not.toBe(second);
  });

  it("does not reuse same-month cache after new logs are added", async () => {
    const now = new Date("2026-03-24T10:00:00.000Z");
    const plants = [createPlant()];

    await getJournalMonthlySummary({
      userId: "user-1",
      plants,
      logs: [
        createLog("log-1", "2026-03-19T10:00:00.000Z"),
        createLog("log-2", "2026-03-18T10:00:00.000Z"),
      ],
      photoCount: 2,
      now,
    });

    await getJournalMonthlySummary({
      userId: "user-1",
      plants,
      logs: [
        createLog("log-3", "2026-03-24T08:00:00.000Z"),
        createLog("log-1", "2026-03-19T10:00:00.000Z"),
        createLog("log-2", "2026-03-18T10:00:00.000Z"),
      ],
      photoCount: 2,
      now,
    });

    expect(requestJournalSummary).toHaveBeenCalledTimes(2);
  });
});

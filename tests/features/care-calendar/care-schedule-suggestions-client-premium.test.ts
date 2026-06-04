import { upsertCareScheduleSuggestion } from "@/features/care-calendar/api/careScheduleSuggestionsClient";

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

jest.mock("@/services/entitlementState", () => ({
  getEntitlementState: jest.fn(() => false),
}));

describe("upsertCareScheduleSuggestion premium gate", () => {
  it("rejects ai_suggested source for free users before touching the database", async () => {
    const { getDatabase } = require("@/services/database/sqlite");
    getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
    });

    await expect(
      upsertCareScheduleSuggestion({
        userId: "user-1",
        plantId: "plant-1",
        careType: "repot",
        frequencyDays: 365,
        nextDueAt: "2026-06-10T09:00:00.000Z",
        enabled: true,
        source: "ai_suggested",
      }),
    ).rejects.toThrow(/AI care schedule/i);

    expect(getDatabase).not.toHaveBeenCalled();
  });
});

const mockGetDatabase = jest.fn();
const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockWithTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));
jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/features/ai/services/reminderOptimizationService", () => ({
  optimizeReminderTiming: ({ nextDueAt }: { nextDueAt: string }) => ({ nextDueAt }),
}));
jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({
    autoSyncEnabled: true,
    remindersEnabled: true,
    defaultWateringHour: 9,
  }),
}));
jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/features/notifications/services/notificationService", () => ({
  cancelReminderNotification: jest.fn().mockResolvedValue(undefined),
}));

describe("plantsClient wateringIntervalDays guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue({
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      withTransactionAsync: mockWithTransactionAsync,
    });
  });

  it("rejects wateringIntervalDays < 1", async () => {
    const { createPlant } = require("@/features/plants/api/plantsClient");
    await expect(
      createPlant({
        userId: "user-1",
        name: "Fern",
        speciesName: "Fern sp.",
        wateringIntervalDays: 0,
      }),
    ).rejects.toThrow("Watering interval must be between 1 and 60 days.");
  });

  it("rejects wateringIntervalDays > 60", async () => {
    const { createPlant } = require("@/features/plants/api/plantsClient");
    await expect(
      createPlant({
        userId: "user-1",
        name: "Fern",
        speciesName: "Fern sp.",
        wateringIntervalDays: 61,
      }),
    ).rejects.toThrow("Watering interval must be between 1 and 60 days.");
  });
});

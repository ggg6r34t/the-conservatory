const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("remindersClient deleteReminder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the local reminder and queues a remote delete operation", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "reminder-1",
      user_id: "user-1",
      plant_id: "plant-1",
      notification_id: "notification-1",
    });
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      deleteReminder,
    } = require("@/features/notifications/api/remindersClient");

    await deleteReminder({ userId: "user-1", reminderId: "reminder-1" });

    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM care_reminders WHERE id = ? AND user_id = ?;",
      "reminder-1",
      "user-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "care_reminders",
      "reminder-1",
      "delete",
      expect.stringContaining('"userId":"user-1"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
  });
});

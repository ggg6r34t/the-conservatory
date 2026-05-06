import { runDatabaseMigrations } from "@/services/database/migrations";

describe("database migrations tags backfill", () => {
  it("extracts embedded note metadata into the dedicated tags column", async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getAllAsync = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes("PRAGMA table_info(user_preferences)")) {
        return Promise.resolve([
          { name: "user_id" },
          { name: "pending" },
          { name: "auto_sync_enabled" },
          { name: "synced_at" },
          { name: "sync_error" },
        ]);
      }

      if (sql.includes("PRAGMA table_info(care_logs)")) {
        return Promise.resolve([
          { name: "id" },
          { name: "plant_id" },
          { name: "current_condition" },
          { name: "tags" },
        ]);
      }

      if (sql.includes("PRAGMA table_info(photos)")) {
        return Promise.resolve([
          { name: "id" },
          { name: "photo_role" },
          { name: "captured_at" },
          { name: "caption" },
        ]);
      }

      if (sql.includes("PRAGMA foreign_key_list(")) {
        return Promise.resolve([
          {
            table: "plants",
            from: "plant_id",
            to: "id",
            on_delete: "CASCADE",
          },
        ]);
      }

      if (sql.includes("SELECT id, notes FROM care_logs")) {
        return Promise.resolve([
          {
            id: "log-1",
            notes:
              'Leaf edges look stronger.\n\n[meta:{"tags":["stable condition","new growth"]}]',
          },
        ]);
      }

      return Promise.resolve([]);
    });

    await runDatabaseMigrations({
      execAsync,
      getAllAsync,
      runAsync,
    } as never);

    expect(runAsync).toHaveBeenCalledWith(
      "UPDATE care_logs SET notes = ?, tags = ? WHERE id = ?;",
      "Leaf edges look stronger.",
      JSON.stringify(["stable condition", "new growth"]),
      "log-1",
    );
  });
});

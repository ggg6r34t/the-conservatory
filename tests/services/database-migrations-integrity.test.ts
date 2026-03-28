import {
  bootstrapSql,
  runDatabaseMigrations,
} from "@/services/database/migrations";

type ForeignKeyMap = Record<string, boolean>;

function createMigrationDatabase(foreignKeys: ForeignKeyMap) {
  const execAsync = jest.fn().mockResolvedValue(undefined);
  const getAllAsync = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes("PRAGMA table_info(care_logs)")) {
      return Promise.resolve([
        { name: "id" },
        { name: "plant_id" },
        { name: "current_condition" },
      ]);
    }

    const fkMatch = sql.match(/PRAGMA foreign_key_list\((.+)\);/);
    if (fkMatch) {
      const table = fkMatch[1] ?? "";
      if (foreignKeys[table]) {
        return Promise.resolve([
          {
            table: "plants",
            from: "plant_id",
            to: "id",
            on_delete: "CASCADE",
          },
        ]);
      }

      return Promise.resolve([]);
    }

    return Promise.resolve([]);
  });

  return {
    execAsync,
    getAllAsync,
  };
}

describe("database migrations integrity", () => {
  it("defines cascade foreign keys for plant child tables in bootstrap schema", () => {
    expect(bootstrapSql).toContain(
      "FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE",
    );
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS photos");
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS care_logs");
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS care_reminders");
    expect(bootstrapSql).toContain(
      "CREATE TABLE IF NOT EXISTS graveyard_plants",
    );
    expect(bootstrapSql).toContain("photo_role TEXT NOT NULL DEFAULT 'progress'");
    expect(bootstrapSql).toContain("captured_at TEXT");
    expect(bootstrapSql).toContain("caption TEXT");
  });

  it("rebuilds child tables with FK constraints when legacy schema has no foreign keys", async () => {
    const database = createMigrationDatabase({
      photos: false,
      care_logs: false,
      care_reminders: false,
      graveyard_plants: false,
    });

    await runDatabaseMigrations(database as never);

    const executedSql = database.execAsync.mock.calls
      .map((call) => String(call[0]))
      .join("\n");

    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS photos_v2");
    expect(executedSql).toContain("CREATE TABLE IF NOT EXISTS care_logs_v2");
    expect(executedSql).toContain(
      "CREATE TABLE IF NOT EXISTS care_reminders_v2",
    );
    expect(executedSql).toContain(
      "CREATE TABLE IF NOT EXISTS graveyard_plants_v2",
    );
    expect(executedSql).toContain(
      "FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE",
    );
    expect(executedSql).toContain(
      "ALTER TABLE graveyard_plants_v2 RENAME TO graveyard_plants",
    );
    expect(executedSql).toContain("photo_role");
    expect(executedSql).toContain("captured_at");
    expect(executedSql).toContain("caption");
  });

  it("skips table rebuild when all required cascade foreign keys already exist", async () => {
    const database = createMigrationDatabase({
      photos: true,
      care_logs: true,
      care_reminders: true,
      graveyard_plants: true,
    });

    await runDatabaseMigrations(database as never);

    const executedSql = database.execAsync.mock.calls
      .map((call) => String(call[0]))
      .join("\n");

    expect(executedSql).not.toContain("_v2");
  });
});

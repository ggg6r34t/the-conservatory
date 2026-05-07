import { bootstrapSql } from "@/services/database/migrations";

describe("release readiness migrations", () => {
  it("creates durable tables for normalized tags, status snapshots, specimen tags, archive overrides, and import runs", () => {
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS care_log_tags");
    expect(bootstrapSql).toContain(
      "CREATE TABLE IF NOT EXISTS plant_status_snapshots",
    );
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS specimen_tags");
    expect(bootstrapSql).toContain(
      "CREATE TABLE IF NOT EXISTS archive_curation_overrides",
    );
    expect(bootstrapSql).toContain("CREATE TABLE IF NOT EXISTS import_runs");
  });
});

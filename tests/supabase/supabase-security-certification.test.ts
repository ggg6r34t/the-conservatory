import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function listMigrations() {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

const TENANT_TABLES = [
  "users",
  "user_preferences",
  "plants",
  "photos",
  "care_logs",
  "care_log_tags",
  "care_reminders",
  "plant_status_snapshots",
  "specimen_tags",
  "archive_curation_overrides",
  "graveyard_plants",
  "feature_usage",
];

const FEATURE_REQUEST_TABLES = [
  "feature_requests",
  "feature_request_votes",
  "feature_request_updates",
  "roadmap_items",
  "feature_request_notifications",
  "feature_request_feedback_scores",
  "beta_program_consents",
];

const AI_TELEMETRY_TABLES = ["edge_ai_usage", "edge_ai_request_log"];

describe("Supabase security certification (static)", () => {
  const migrationSql = listMigrations().map((file) =>
    read(path.join("supabase", "migrations", file)),
  ).join("\n");

  const baseline = read(
    "supabase/migrations/20260401000000_baseline_conservatory_schema_rls.sql",
  );
  const hardening = read(
    "supabase/migrations/20260602150000_security_hardening.sql",
  );
  const schemaCanonical = read("database/schema.sql");

  it("ships baseline schema and RLS in supabase migrations", () => {
    expect(listMigrations()).toContain(
      "20260401000000_baseline_conservatory_schema_rls.sql",
    );
    expect(baseline).toContain("enable row level security");
    expect(baseline).toContain('create policy "plants own or admin"');
    expect(baseline).toContain("bucket_id = 'photos'");
  });

  it("keeps database/schema.sql aligned with baseline migration policies", () => {
    for (const table of TENANT_TABLES.slice(0, 11)) {
      expect(baseline).toContain(`public.${table}`);
      expect(schemaCanonical).toContain(`public.${table}`);
    }
  });

  it.each(TENANT_TABLES)(
    "enables RLS on tenant table %s",
    (table) => {
      expect(migrationSql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    },
  );

  it.each(FEATURE_REQUEST_TABLES)(
    "enables RLS on feature-request table %s",
    (table) => {
      expect(migrationSql).toMatch(
        new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"),
      );
    },
  );

  it("locks AI telemetry tables from direct client access", () => {
    expect(hardening).toContain(
      "ALTER TABLE public.edge_ai_usage ENABLE ROW LEVEL SECURITY",
    );
    expect(hardening).toContain(
      "REVOKE ALL ON TABLE public.edge_ai_usage FROM anon, authenticated",
    );
    expect(hardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.consume_ai_usage",
    );
    expect(hardening).toContain("TO service_role");
  });

  it("isolates feature_usage per user", () => {
    expect(hardening).toContain("CREATE TABLE IF NOT EXISTS public.feature_usage");
    expect(hardening).toContain("feature_usage_select_own");
    expect(hardening).toContain("auth.uid() = user_id");
  });

  it("restricts photos storage bucket to owner folder paths", () => {
    expect(baseline).toContain("insert into storage.buckets");
    expect(baseline).toContain("'photos'");
    expect(baseline).toContain("photo objects own folder read");
    expect(baseline).toContain("storage.foldername(name)");
  });

  it("purges storage before auth user deletion in delete-account", () => {
    const source = read("supabase/functions/delete-account/index.ts");
    const helper = read("supabase/functions/_shared/accountDeletion.ts");

    expect(helper).toContain("purgeUserStorageObjects");
    expect(source).toContain("purgeUserStorageObjects");
    expect(source.indexOf("purgeUserStorageObjects")).toBeLessThan(
      source.indexOf("auth.admin.deleteUser"),
    );
  });

  it.each(AI_TELEMETRY_TABLES)(
    "includes migration coverage for %s",
    (table) => {
      expect(migrationSql).toContain(table);
    },
  );
});

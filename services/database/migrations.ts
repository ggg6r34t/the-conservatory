import type { SQLiteDatabase } from "expo-sqlite";

export const bootstrapSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS local_auth_credentials (
  user_id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  preferred_theme TEXT NOT NULL DEFAULT 'linen-light',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_watering_hour INTEGER NOT NULL DEFAULT 9,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT,
  sync_error TEXT
);

CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  species_name TEXT NOT NULL,
  nickname TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  location TEXT,
  watering_interval_days INTEGER NOT NULL DEFAULT 7,
  last_watered_at TEXT,
  next_water_due_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  local_uri TEXT,
  remote_url TEXT,
  storage_path TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  photo_role TEXT NOT NULL DEFAULT 'progress',
  captured_at TEXT,
  taken_at TEXT,
  caption TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  log_type TEXT NOT NULL,
  current_condition TEXT,
  notes TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  frequency_days INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_due_at TEXT,
  last_triggered_at TEXT,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS graveyard_plants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  cause_of_passing TEXT,
  memorial_note TEXT,
  archived_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TEXT,
  queued_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_next_water_due_at ON plants(next_water_due_at);
CREATE INDEX IF NOT EXISTS idx_care_logs_plant_id ON care_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_reminders_plant_id ON care_reminders(plant_id);
CREATE INDEX IF NOT EXISTS idx_photos_plant_id ON photos(plant_id);
CREATE INDEX IF NOT EXISTS idx_local_auth_credentials_email ON local_auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_retry ON sync_queue(status, next_retry_at);
`;

async function ensureColumn(
  database: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table});`,
  );

  if (columns.some((entry) => entry.name === column)) {
    return;
  }

  await database.execAsync(
    `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`,
  );
}

async function removeOrphanedPlantChildren(database: SQLiteDatabase) {
  // Tier-2 guardrail: current tables were created without FK constraints.
  // Until a full table-rebuild migration is scheduled, clean obvious orphans
  // so child tables do not retain references to deleted plants.
  await database.execAsync(`
DELETE FROM photos WHERE plant_id NOT IN (SELECT id FROM plants);
DELETE FROM care_logs WHERE plant_id NOT IN (SELECT id FROM plants);
DELETE FROM care_reminders WHERE plant_id NOT IN (SELECT id FROM plants);
DELETE FROM graveyard_plants WHERE plant_id NOT IN (SELECT id FROM plants);
`);
}

interface ForeignKeyRow {
  table: string;
  from: string;
  to: string;
  on_delete: string;
}

async function hasPlantCascadeForeignKey(
  database: SQLiteDatabase,
  table: string,
  column: string,
) {
  const rows = await database.getAllAsync<ForeignKeyRow>(
    `PRAGMA foreign_key_list(${table});`,
  );

  return rows.some(
    (row) =>
      row.table === "plants" &&
      row.from === column &&
      row.to === "id" &&
      row.on_delete.toUpperCase() === "CASCADE",
  );
}

async function rebuildPlantChildTablesWithForeignKeys(
  database: SQLiteDatabase,
) {
  await database.execAsync("PRAGMA foreign_keys = OFF;");

  try {
    await database.execAsync(`
DROP TABLE IF EXISTS photos_v2;
DROP TABLE IF EXISTS care_logs_v2;
DROP TABLE IF EXISTS care_reminders_v2;
DROP TABLE IF EXISTS graveyard_plants_v2;

CREATE TABLE IF NOT EXISTS photos_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  local_uri TEXT,
  remote_url TEXT,
  storage_path TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  photo_role TEXT NOT NULL DEFAULT 'progress',
  captured_at TEXT,
  taken_at TEXT,
  caption TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

INSERT INTO photos_v2 (
  id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type,
  width, height, photo_role, captured_at, taken_at, caption, is_primary, created_at, updated_at,
  pending, synced_at, sync_error
)
SELECT
  id, user_id, plant_id, local_uri, remote_url, storage_path, mime_type,
  width, height,
  CASE WHEN is_primary = 1 THEN 'primary' ELSE 'progress' END,
  COALESCE(taken_at, created_at),
  taken_at,
  NULL,
  is_primary,
  created_at, updated_at,
  pending, synced_at, sync_error
FROM photos;

CREATE TABLE IF NOT EXISTS care_logs_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  log_type TEXT NOT NULL,
  current_condition TEXT,
  notes TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

INSERT INTO care_logs_v2 (
  id, user_id, plant_id, log_type, current_condition, notes,
  logged_at, created_at, updated_at, updated_by,
  pending, synced_at, sync_error
)
SELECT
  id, user_id, plant_id, log_type, current_condition, notes,
  logged_at, created_at, updated_at, updated_by,
  pending, synced_at, sync_error
FROM care_logs;

CREATE TABLE IF NOT EXISTS care_reminders_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  frequency_days INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_due_at TEXT,
  last_triggered_at TEXT,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

INSERT INTO care_reminders_v2 (
  id, user_id, plant_id, reminder_type, frequency_days, enabled,
  next_due_at, last_triggered_at, notification_id,
  created_at, updated_at, updated_by,
  pending, synced_at, sync_error
)
SELECT
  id, user_id, plant_id, reminder_type, frequency_days, enabled,
  next_due_at, last_triggered_at, notification_id,
  created_at, updated_at, updated_by,
  pending, synced_at, sync_error
FROM care_reminders;

CREATE TABLE IF NOT EXISTS graveyard_plants_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  cause_of_passing TEXT,
  memorial_note TEXT,
  archived_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

INSERT INTO graveyard_plants_v2 (
  id, user_id, plant_id, cause_of_passing, memorial_note,
  archived_at, created_at, updated_at, updated_by,
  pending, synced_at, sync_error
)
SELECT
  id, user_id, plant_id, cause_of_passing, memorial_note,
  archived_at, created_at, updated_at, updated_by,
  pending, synced_at, sync_error
FROM graveyard_plants;

DROP TABLE photos;
ALTER TABLE photos_v2 RENAME TO photos;

DROP TABLE care_logs;
ALTER TABLE care_logs_v2 RENAME TO care_logs;

DROP TABLE care_reminders;
ALTER TABLE care_reminders_v2 RENAME TO care_reminders;

DROP TABLE graveyard_plants;
ALTER TABLE graveyard_plants_v2 RENAME TO graveyard_plants;

CREATE INDEX IF NOT EXISTS idx_photos_plant_id ON photos(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_plant_id ON care_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_reminders_plant_id ON care_reminders(plant_id);
`);
  } finally {
    await database.execAsync("PRAGMA foreign_keys = ON;");
  }
}

async function ensurePlantChildForeignKeys(database: SQLiteDatabase) {
  const [photosFk, careLogsFk, careRemindersFk, graveyardFk] =
    await Promise.all([
      hasPlantCascadeForeignKey(database, "photos", "plant_id"),
      hasPlantCascadeForeignKey(database, "care_logs", "plant_id"),
      hasPlantCascadeForeignKey(database, "care_reminders", "plant_id"),
      hasPlantCascadeForeignKey(database, "graveyard_plants", "plant_id"),
    ]);

  if (photosFk && careLogsFk && careRemindersFk && graveyardFk) {
    return;
  }

  await removeOrphanedPlantChildren(database);
  await rebuildPlantChildTablesWithForeignKeys(database);
}

async function backfillPhotoTimelineMetadata(database: SQLiteDatabase) {
  await database.execAsync(`
UPDATE photos
SET photo_role = CASE WHEN is_primary = 1 THEN 'primary' ELSE 'progress' END
WHERE photo_role IS NULL OR TRIM(photo_role) = '';

UPDATE photos
SET captured_at = COALESCE(captured_at, taken_at, created_at)
WHERE captured_at IS NULL;
`);
}

export async function runDatabaseMigrations(database: SQLiteDatabase) {
  await database.execAsync(bootstrapSql);
  await database.execAsync("PRAGMA foreign_keys = ON;");
  await ensureColumn(
    database,
    "user_preferences",
    "pending",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await ensureColumn(database, "user_preferences", "synced_at", "TEXT");
  await ensureColumn(database, "user_preferences", "sync_error", "TEXT");
  await ensureColumn(database, "care_logs", "current_condition", "TEXT");
  await ensurePlantChildForeignKeys(database);
  await ensureColumn(
    database,
    "photos",
    "photo_role",
    "TEXT NOT NULL DEFAULT 'progress'",
  );
  await ensureColumn(database, "photos", "captured_at", "TEXT");
  await ensureColumn(database, "photos", "caption", "TEXT");
  await backfillPhotoTimelineMetadata(database);
}

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

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  preferred_theme TEXT NOT NULL DEFAULT 'linen-light',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_watering_hour INTEGER NOT NULL DEFAULT 9,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
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
  taken_at TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT
);

CREATE TABLE IF NOT EXISTS care_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  log_type TEXT NOT NULL,
  notes TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  sync_error TEXT
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
  sync_error TEXT
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
  sync_error TEXT
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
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_retry ON sync_queue(status, next_retry_at);
`;

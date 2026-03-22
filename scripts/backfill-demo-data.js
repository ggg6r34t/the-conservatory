// backfill-demo-data.js
// Usage: node backfill-demo-data.js
// Populates all tables with realistic demo data for a given userId

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const userId = "3e2d9b1b-953d-4d1a-9a4f-f18a229c2e9d";
const dbPath = path.join(__dirname, "the-conservatory.db");
const db = new sqlite3.Database(dbPath);

const now = new Date().toISOString();

const user = {
  id: userId,
  email: "demo.gardener@example.com",
  display_name: "Demo Gardener",
  avatar_url: null,
  role: "user",
  created_at: now,
  updated_at: now,
};

const plants = [
  {
    id: "plant-1",
    user_id: userId,
    name: "Monstera",
    species_name: "Monstera deliciosa",
    nickname: "Swiss Cheese",
    status: "active",
    location: "Living Room",
    watering_interval_days: 7,
    last_watered_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    next_water_due_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    notes: "Thrives in bright, indirect light.",
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
  {
    id: "plant-2",
    user_id: userId,
    name: "Fiddle Leaf Fig",
    species_name: "Ficus lyrata",
    nickname: "Fiddle",
    status: "active",
    location: "Bedroom",
    watering_interval_days: 10,
    last_watered_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    next_water_due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    notes: "Sensitive to overwatering.",
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
  {
    id: "plant-3",
    user_id: userId,
    name: "Snake Plant",
    species_name: "Sansevieria trifasciata",
    nickname: "Mother-in-law’s Tongue",
    status: "graveyard",
    location: "Office",
    watering_interval_days: 14,
    last_watered_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    next_water_due_at: null,
    notes: "Died after root rot.",
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
];

const photos = [
  {
    id: "photo-1",
    user_id: userId,
    plant_id: "plant-1",
    local_uri: "assets/images/monstera.jpg",
    remote_url: null,
    storage_path:
      "photos/3e2d9b1b-953d-4d1a-9a4f-f18a229c2e9d/plant-1/photo-1.jpg",
    mime_type: "image/jpeg",
    width: 800,
    height: 600,
    taken_at: now,
    is_primary: 1,
    created_at: now,
    updated_at: now,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
  {
    id: "photo-2",
    user_id: userId,
    plant_id: "plant-2",
    local_uri: "assets/images/ficus.jpg",
    remote_url: null,
    storage_path:
      "photos/3e2d9b1b-953d-4d1a-9a4f-f18a229c2e9d/plant-2/photo-2.jpg",
    mime_type: "image/jpeg",
    width: 800,
    height: 600,
    taken_at: now,
    is_primary: 1,
    created_at: now,
    updated_at: now,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
];

const careLogs = [
  {
    id: "log-1",
    user_id: userId,
    plant_id: "plant-1",
    log_type: "water",
    notes: "Watered thoroughly.",
    logged_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
  {
    id: "log-2",
    user_id: userId,
    plant_id: "plant-2",
    log_type: "water",
    notes: "Soil was dry.",
    logged_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
];

const reminders = [
  {
    id: "reminder-1",
    user_id: userId,
    plant_id: "plant-1",
    reminder_type: "water",
    frequency_days: 7,
    enabled: 1,
    next_due_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    last_triggered_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
  {
    id: "reminder-2",
    user_id: userId,
    plant_id: "plant-2",
    reminder_type: "water",
    frequency_days: 10,
    enabled: 1,
    next_due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    last_triggered_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
];

const graveyard = [
  {
    id: "graveyard-1",
    user_id: userId,
    plant_id: "plant-3",
    cause_of_passing: "Root rot",
    memorial_note: "Gone but not forgotten.",
    archived_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: now,
    updated_at: now,
    updated_by: userId,
    pending: 0,
    synced_at: now,
    sync_error: null,
  },
];

const credentials = [
  {
    user_id: userId,
    email: user.email,
    password_hash: "demo-hash",
    created_at: now,
    updated_at: now,
  },
];

function insert(table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
  db.run(
    sql,
    keys.map((k) => row[k]),
  );
}

db.serialize(() => {
  insert("users", user);
  plants.forEach((p) => insert("plants", p));
  photos.forEach((p) => insert("photos", p));
  careLogs.forEach((l) => insert("care_logs", l));
  reminders.forEach((r) => insert("care_reminders", r));
  graveyard.forEach((g) => insert("graveyard_plants", g));
  credentials.forEach((c) => insert("local_auth_credentials", c));
  console.log("Demo data inserted for user:", userId);
  db.close();
});

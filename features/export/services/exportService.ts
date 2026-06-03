import { Directory, File, Paths } from "expo-file-system";

import { getDatabase } from "@/services/database/sqlite";
import {
  getCareLogHistorySinceForMode,
  getExportCareLogHistoryLimitDays,
  resolveExportMode,
  type ExportMode,
} from "@/features/export/services/exportAccessPolicy";
import { resolveThemeId } from "@/features/theme/registry";
import type {
  AppUser,
  CareLog,
  CareLogCondition,
  CareLogType,
  CareReminder,
  GraveyardPlant,
  Photo,
  Plant,
  UserPreferences,
} from "@/types/models";

interface ExportSummary {
  plants: number;
  careLogs: number;
  photos: number;
  reminders: number;
  memorialEntries: number;
  notes: number;
}

interface ExportResult {
  fileName: string;
  fileUri: string;
  summary: ExportSummary;
  shared: boolean;
  mode: ExportMode;
}

interface ExportPayload {
  exportVersion: 2;
  exportMode: ExportMode;
  exportedAt: string;
  format: "json";
  app: {
    name: string;
  };
  includes: {
    photos: "count-only" | "metadata-and-uris";
    authenticationData: "excluded";
    premiumSections: boolean;
    careLogHistoryLimitDays: number | null;
  };
  preferences: UserPreferences | null;
  plants: Plant[];
  careLogs: CareLog[];
  photos: Photo[];
  reminders: CareReminder[];
  memorialEntries: GraveyardPlant[];
  statusSnapshots: unknown[];
  specimenTags: unknown[];
  archiveCurationOverrides: unknown[];
}

interface CountRow {
  total: number;
}

interface PlantRow {
  id: string;
  user_id: string;
  name: string;
  species_name: string;
  nickname: string | null;
  status: "active" | "graveyard";
  location: string | null;
  watering_interval_days: number;
  last_watered_at: string | null;
  next_water_due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface CareLogRow {
  id: string;
  user_id: string;
  plant_id: string;
  log_type: CareLogType;
  current_condition: CareLogCondition | null;
  notes: string | null;
  tags: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface PhotoRow {
  id: string;
  user_id: string;
  plant_id: string;
  local_uri: string | null;
  remote_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  photo_role: "primary" | "progress" | null;
  captured_at: string | null;
  taken_at: string | null;
  caption: string | null;
  is_primary: number;
  created_at: string;
  updated_at: string;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface ReminderRow {
  id: string;
  user_id: string;
  plant_id: string;
  reminder_type: "water" | "mist" | "feed";
  frequency_days: number;
  enabled: number;
  next_due_at: string | null;
  last_triggered_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface GraveyardRow {
  id: string;
  user_id: string;
  plant_id: string;
  cause_of_passing: string | null;
  memorial_note: string | null;
  archived_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

interface PreferencesRow {
  user_id: string;
  reminders_enabled: number;
  auto_sync_enabled: number;
  preferred_theme: "linen-light";
  timezone: string;
  default_watering_hour: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}

function mapPlant(row: PlantRow): Plant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    speciesName: row.species_name,
    nickname: row.nickname,
    status: row.status,
    location: row.location,
    wateringIntervalDays: row.watering_interval_days,
    lastWateredAt: row.last_watered_at,
    nextWaterDueAt: row.next_water_due_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function parseCareLogTags(tags: string | null) {
  if (!tags) {
    return null;
  }

  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : null;
  } catch {
    return null;
  }
}

function mapCareLog(row: CareLogRow): CareLog {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    logType: row.log_type,
    currentCondition: row.current_condition,
    notes: row.notes,
    tags: parseCareLogTags(row.tags),
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function mapPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    localUri: row.local_uri,
    remoteUrl: row.remote_url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    photoRole:
      row.photo_role ?? (row.is_primary === 1 ? "primary" : "progress"),
    capturedAt: row.captured_at,
    takenAt: row.taken_at,
    caption: row.caption,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function mapReminder(row: ReminderRow): CareReminder {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    reminderType: row.reminder_type,
    frequencyDays: row.frequency_days,
    enabled: row.enabled,
    nextDueAt: row.next_due_at,
    lastTriggeredAt: row.last_triggered_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function mapGraveyard(row: GraveyardRow): GraveyardPlant {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    causeOfPassing: row.cause_of_passing,
    memorialNote: row.memorial_note,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function mapPreferences(row: PreferencesRow): UserPreferences {
  return {
    userId: row.user_id,
    remindersEnabled: Boolean(row.reminders_enabled),
    autoSyncEnabled: Boolean(row.auto_sync_enabled),
    preferredTheme: resolveThemeId(row.preferred_theme),
    timezone: row.timezone,
    defaultWateringHour: row.default_watering_hour,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function buildFileName(date: Date) {
  return `the-conservatory-export-${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

async function loadSharingModule() {
  try {
    return await import("expo-sharing");
  } catch {
    return null;
  }
}

async function countQuery(
  database: Awaited<ReturnType<typeof getDatabase>>,
  sql: string,
  ...params: string[]
) {
  const row = await database.getFirstAsync<CountRow>(sql, ...params);
  return row?.total ?? 0;
}

export async function getExportCollectionSummary(
  userId: string,
  options: { mode?: ExportMode } = {},
): Promise<ExportSummary> {
  const mode = resolveExportMode(options.mode);
  const careLogSince = getCareLogHistorySinceForMode(mode);
  const database = await getDatabase();
  const [
    plants,
    careLogs,
    photos,
    reminders,
    memorialEntries,
    plantNotes,
    logNotes,
  ] = await Promise.all([
    countQuery(
      database,
      "SELECT COUNT(*) AS total FROM plants WHERE user_id = ?;",
      userId,
    ),
    careLogSince
      ? countQuery(
          database,
          "SELECT COUNT(*) AS total FROM care_logs WHERE user_id = ? AND logged_at >= ?;",
          userId,
          careLogSince,
        )
      : countQuery(
          database,
          "SELECT COUNT(*) AS total FROM care_logs WHERE user_id = ?;",
          userId,
        ),
    countQuery(
      database,
      "SELECT COUNT(*) AS total FROM photos WHERE user_id = ?;",
      userId,
    ),
    countQuery(
      database,
      "SELECT COUNT(*) AS total FROM care_reminders WHERE user_id = ?;",
      userId,
    ),
    countQuery(
      database,
      "SELECT COUNT(*) AS total FROM graveyard_plants WHERE user_id = ?;",
      userId,
    ),
    countQuery(
      database,
      "SELECT COUNT(*) AS total FROM plants WHERE user_id = ? AND notes IS NOT NULL AND TRIM(notes) != '';",
      userId,
    ),
    careLogSince
      ? countQuery(
          database,
          "SELECT COUNT(*) AS total FROM care_logs WHERE user_id = ? AND logged_at >= ? AND notes IS NOT NULL AND TRIM(notes) != '';",
          userId,
          careLogSince,
        )
      : countQuery(
          database,
          "SELECT COUNT(*) AS total FROM care_logs WHERE user_id = ? AND notes IS NOT NULL AND TRIM(notes) != '';",
          userId,
        ),
  ]);

  return {
    plants,
    careLogs,
    photos,
    reminders,
    memorialEntries,
    notes: plantNotes + logNotes,
  };
}

async function buildExportPayload(
  user: AppUser,
  mode: ExportMode,
): Promise<{ payload: ExportPayload; summary: ExportSummary }> {
  const premium = mode === "premium";
  const careLogSince = getCareLogHistorySinceForMode(mode);
  const database = await getDatabase();
  const careLogSql = careLogSince
    ? "SELECT * FROM care_logs WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC;"
    : "SELECT * FROM care_logs WHERE user_id = ? ORDER BY logged_at DESC;";
  const careLogParams = careLogSince ? [user.id, careLogSince] : [user.id];
  const [
    summary,
    preferencesRow,
    plantRows,
    careLogRows,
    photoRows,
    reminderRows,
    graveyardRows,
    statusSnapshotRows,
    specimenTagRows,
    archiveOverrideRows,
  ] = await Promise.all([
    getExportCollectionSummary(user.id, { mode }),
    database.getFirstAsync<PreferencesRow>(
      "SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1;",
      user.id,
    ),
    database.getAllAsync<PlantRow>(
      "SELECT * FROM plants WHERE user_id = ? ORDER BY updated_at DESC;",
      user.id,
    ),
    database.getAllAsync<CareLogRow>(careLogSql, ...careLogParams),
    database.getAllAsync<PhotoRow>(
      "SELECT * FROM photos WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC;",
      user.id,
    ),
    database.getAllAsync<ReminderRow>(
      "SELECT * FROM care_reminders WHERE user_id = ? ORDER BY next_due_at ASC, created_at DESC;",
      user.id,
    ),
    database.getAllAsync<GraveyardRow>(
      "SELECT * FROM graveyard_plants WHERE user_id = ? ORDER BY archived_at DESC;",
      user.id,
    ),
    database.getAllAsync(
      "SELECT * FROM plant_status_snapshots WHERE user_id = ? ORDER BY captured_at DESC;",
      user.id,
    ),
    database.getAllAsync(
      "SELECT * FROM specimen_tags WHERE user_id = ? ORDER BY updated_at DESC;",
      user.id,
    ),
    database.getAllAsync(
      "SELECT * FROM archive_curation_overrides WHERE user_id = ? ORDER BY updated_at DESC;",
      user.id,
    ),
  ]);

  const careLogs = careLogRows.map(mapCareLog).map((log) =>
    premium
      ? log
      : {
          ...log,
          tags: null,
        },
  );

  return {
    summary,
    payload: {
      exportVersion: 2,
      exportMode: mode,
      exportedAt: new Date().toISOString(),
      format: "json",
      app: {
        name: "The Conservatory",
      },
      includes: {
        photos: premium ? "metadata-and-uris" : "count-only",
        authenticationData: "excluded",
        premiumSections: premium,
        careLogHistoryLimitDays: getExportCareLogHistoryLimitDays(mode),
      },
      preferences: preferencesRow ? mapPreferences(preferencesRow) : null,
      plants: plantRows.map(mapPlant),
      careLogs,
      photos: premium ? photoRows.map(mapPhoto) : [],
      reminders: reminderRows.map(mapReminder),
      memorialEntries: graveyardRows.map(mapGraveyard),
      statusSnapshots: premium ? statusSnapshotRows : [],
      specimenTags: premium ? specimenTagRows : [],
      archiveCurationOverrides: premium ? archiveOverrideRows : [],
    },
  };
}

export async function shareExportFile(fileUri: string) {
  const sharing = await loadSharingModule();
  if (!sharing) {
    return false;
  }

  const isAvailable = await sharing.isAvailableAsync().catch(() => false);
  if (!isAvailable) {
    return false;
  }

  await sharing.shareAsync(fileUri, {
    dialogTitle: "Export Collection Data",
    mimeType: "application/json",
    UTI: "public.json",
  });
  return true;
}

export async function exportCollectionData(
  user: AppUser,
  options: { mode?: ExportMode } = {},
): Promise<ExportResult> {
  const mode = resolveExportMode(options.mode);

  const { payload, summary } = await buildExportPayload(user, mode);
  const totalRecords =
    summary.plants +
    summary.careLogs +
    summary.photos +
    summary.reminders +
    summary.memorialEntries;

  if (totalRecords === 0) {
    throw new Error("There isn't any collection data to export yet.");
  }

  const fileName = buildFileName(new Date());
  const exportDirectory = new Directory(Paths.document, "exports");
  exportDirectory.create({ idempotent: true, intermediates: true });

  const exportFile = new File(exportDirectory, fileName);
  exportFile.create({ intermediates: true, overwrite: true });
  exportFile.write(JSON.stringify(payload, null, 2));

  return {
    fileName,
    fileUri: exportFile.uri,
    summary,
    shared: await shareExportFile(exportFile.uri),
    mode,
  };
}

export type { ExportMode, ExportPayload, ExportResult, ExportSummary };

export type EntitySyncState = "synced" | "pending" | "error";
export type PlantStatus = "active" | "graveyard";
export type CareLogType = "water" | "mist" | "feed" | "prune" | "pest" | "note";
export type ReminderType = "water" | "mist" | "feed";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  remindersEnabled: boolean;
  preferredTheme: "linen-light";
  timezone: string;
  defaultWateringHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface Plant {
  id: string;
  userId: string;
  name: string;
  speciesName: string;
  nickname?: string | null;
  status: PlantStatus;
  location?: string | null;
  wateringIntervalDays: number;
  lastWateredAt?: string | null;
  nextWaterDueAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  pending: number;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface Photo {
  id: string;
  userId: string;
  plantId: string;
  localUri?: string | null;
  remoteUrl?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  takenAt?: string | null;
  isPrimary: number;
  createdAt: string;
  updatedAt: string;
  pending: number;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface CareLog {
  id: string;
  userId: string;
  plantId: string;
  logType: CareLogType;
  notes?: string | null;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  pending: number;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface CareReminder {
  id: string;
  userId: string;
  plantId: string;
  reminderType: ReminderType;
  frequencyDays: number;
  enabled: number;
  nextDueAt?: string | null;
  lastTriggeredAt?: string | null;
  notificationId?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  pending: number;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface GraveyardPlant {
  id: string;
  userId: string;
  plantId: string;
  causeOfPassing?: string | null;
  memorialNote?: string | null;
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  pending: number;
  syncedAt?: string | null;
  syncError?: string | null;
}

export interface PlantWithRelations {
  plant: Plant;
  photos: Photo[];
  reminders: CareReminder[];
  logs: CareLog[];
}

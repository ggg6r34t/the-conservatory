export const DATABASE_NAME = "the-conservatory.db";
export const STORAGE_BUCKET = "photos";
export const LOCAL_THEME = "linen-light";
export const NETWORK_REFRESH_MS = 15000;

export const queryKeys = {
  auth: ["auth"] as const,
  dashboard: ["dashboard"] as const,
  plants: ["plants"] as const,
  plant: (id: string) => ["plants", id] as const,
  careLogs: (plantId: string) => ["care-logs", plantId] as const,
  reminders: ["reminders"] as const,
  preferences: ["preferences"] as const,
};

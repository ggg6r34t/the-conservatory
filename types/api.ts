import type {
  AppUser,
  CareLog,
  CareReminder,
  Photo,
  Plant,
  UserPreferences,
} from "@/types/models";

export interface AuthResult {
  user: AppUser;
  requiresEmailVerification: boolean;
}

export interface PlantDetailResponse {
  plant: Plant;
  photos: Photo[];
  reminders: CareReminder[];
  recentLogs: CareLog[];
}

export interface DashboardResponse {
  plants: Plant[];
  dueToday: Plant[];
  preferences: UserPreferences;
}

export interface AppErrorShape {
  code: string;
  message: string;
  retryable: boolean;
}

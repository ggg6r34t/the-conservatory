import * as SecureStore from "expo-secure-store";

import {
  createGuestAppUser,
  PENDING_GUEST_MIGRATION_KEY,
} from "@/features/auth/constants/guestUser";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  readSession,
  writeSession,
} from "@/services/auth/sessionManager";
import { getDatabase } from "@/services/database/sqlite";
import type { AppUser } from "@/types/models";
import { logger } from "@/utils/logger";

async function persistGuestUserRow(user: AppUser) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO users (id, email, display_name, avatar_url, role, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    user.id,
    user.email,
    user.displayName,
    user.avatarUrl ?? null,
    user.role,
    user.createdAt,
    user.updatedAt,
    user.id,
  );
}

export async function restoreGuestSession(): Promise<AppUser | null> {
  const session = await readSession();
  if (!session?.isGuest) {
    return null;
  }

  return session;
}

export async function bootstrapGuestUser(existingUser?: AppUser): Promise<AppUser> {
  const guestUser = existingUser ?? createGuestAppUser();
  await persistGuestUserRow(guestUser);
  await getUserPreferences(guestUser.id);
  await writeSession(guestUser);
  return guestUser;
}

export async function continueAsGuest(): Promise<AppUser> {
  const existing = await restoreGuestSession();
  if (existing) {
    logger.info("guest.session.restored", { userId: existing.id });
    return existing;
  }

  const guestUser = await bootstrapGuestUser();
  logger.info("guest.session.created", { userId: guestUser.id });
  return guestUser;
}

export async function readPendingGuestMigrationId() {
  try {
    return await SecureStore.getItemAsync(PENDING_GUEST_MIGRATION_KEY);
  } catch {
    return null;
  }
}

export async function writePendingGuestMigrationId(guestUserId: string) {
  await SecureStore.setItemAsync(PENDING_GUEST_MIGRATION_KEY, guestUserId);
}

export async function clearPendingGuestMigrationId() {
  await SecureStore.deleteItemAsync(PENDING_GUEST_MIGRATION_KEY).catch(
    () => undefined,
  );
}

export async function hasGuestLocalData(guestUserId: string) {
  const database = await getDatabase();
  const plantCount = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plants WHERE user_id = ?;`,
    guestUserId,
  );
  return (plantCount?.count ?? 0) > 0;
}

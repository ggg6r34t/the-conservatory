import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { getDatabase } from "@/services/database/sqlite";
import {
  clearSession,
  readSession,
  writeSession,
} from "@/services/auth/sessionManager";
import type { AuthResult } from "@/types/api";
import type { AppUser } from "@/types/models";
import { logger } from "@/utils/logger";

function createLocalUser(email: string, displayName?: string): AppUser {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    email,
    displayName: displayName ?? email.split("@")[0] ?? "Curator",
    avatarUrl: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
  };
}

function createSupabaseUser(
  id: string,
  email: string,
  displayName?: string,
  avatarUrl?: string | null,
): AppUser {
  const now = new Date().toISOString();
  return {
    id,
    email,
    displayName: displayName ?? email.split("@")[0] ?? "Curator",
    avatarUrl: avatarUrl ?? null,
    role: "user",
    createdAt: now,
    updatedAt: now,
  };
}

async function syncRemoteProfile(user: AppUser) {
  if (!supabase) {
    return user;
  }

  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      role: user.role,
      updated_by: user.id,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    logger.warn("profile.upsert_failed", { message: upsertError.message });
    return user;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    if (profileError) {
      logger.warn("profile.fetch_failed", { message: profileError.message });
    }
    return user;
  }

  return {
    ...user,
    displayName: profile.display_name ?? user.displayName,
    avatarUrl: profile.avatar_url ?? user.avatarUrl,
    role: profile.role ?? user.role,
    updatedAt: new Date().toISOString(),
  };
}

async function persistLocalUser(user: AppUser) {
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
  await getUserPreferences(user.id);
}

export async function getInitialAuthUser() {
  if (env.isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const user = createSupabaseUser(
        data.session.user.id,
        data.session.user.email ?? "botanist@conservatory.com",
        data.session.user.user_metadata.display_name,
        data.session.user.user_metadata.avatar_url,
      );
      const syncedProfile = await syncRemoteProfile(user);
      await persistLocalUser(syncedProfile);
      await writeSession(syncedProfile);
      return syncedProfile;
    }
  }

  return readSession();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (env.isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      throw error ?? new Error("Unable to sign in.");
    }

    const user = createSupabaseUser(
      data.user.id,
      email,
      data.user.user_metadata.display_name,
      data.user.user_metadata.avatar_url,
    );
    const syncedProfile = await syncRemoteProfile(user);
    await persistLocalUser(syncedProfile);
    await writeSession(syncedProfile);
    return { user: syncedProfile, requiresEmailVerification: false };
  }

  logger.warn(
    "Supabase is not configured. Falling back to local development auth.",
  );
  const user = createLocalUser(email);
  await persistLocalUser(user);
  await writeSession(user);
  return { user, requiresEmailVerification: false };
}

export async function signup(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  if (env.isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error || !data.user) {
      throw error ?? new Error("Unable to create account.");
    }

    const user = createSupabaseUser(
      data.user.id,
      email,
      displayName,
      data.user.user_metadata.avatar_url,
    );
    const syncedProfile = await syncRemoteProfile(user);
    await persistLocalUser(syncedProfile);
    if (data.session) {
      await writeSession(syncedProfile);
    }
    return { user: syncedProfile, requiresEmailVerification: !data.session };
  }

  logger.warn(
    "Supabase is not configured. Falling back to local development signup.",
  );
  const user = createLocalUser(email, displayName);
  await persistLocalUser(user);
  await writeSession(user);
  return { user, requiresEmailVerification: false };
}

export async function requestPasswordReset(email: string) {
  if (env.isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
    return;
  }

  logger.warn(
    "Supabase is not configured. Password reset is simulated locally.",
  );
}

export async function logout() {
  if (env.isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }

  await clearSession();
}

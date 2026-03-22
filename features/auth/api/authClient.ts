import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  clearSession,
  readSession,
  writeSession,
} from "@/services/auth/sessionManager";
import { getDatabase } from "@/services/database/sqlite";
import type { AuthResult } from "@/types/api";
import type { AppUser } from "@/types/models";
import { logger } from "@/utils/logger";

interface LocalUserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

interface LocalCredentialRow {
  user_id: string;
  email: string;
  password_hash: string;
}

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

function mapLocalUser(row: LocalUserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fallbackPasswordHash(password: string) {
  let hash = 2166136261;
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function hashLocalPassword(password: string) {
  try {
    const cryptoModule = await import("expo-crypto");
    return cryptoModule.digestStringAsync(
      cryptoModule.CryptoDigestAlgorithm.SHA256,
      password,
    );
  } catch (error) {
    logger.warn("auth.local_hash_fallback", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return fallbackPasswordHash(password);
  }
}

async function getLocalCredentialByEmail(email: string) {
  const database = await getDatabase();
  return database.getFirstAsync<LocalCredentialRow>(
    "SELECT * FROM local_auth_credentials WHERE email = ? LIMIT 1;",
    email,
  );
}

async function getLocalUserById(userId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<LocalUserRow>(
    "SELECT * FROM users WHERE id = ? LIMIT 1;",
    userId,
  );

  return row ? mapLocalUser(row) : null;
}

async function getLocalUserByEmail(email: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<LocalUserRow>(
    "SELECT * FROM users WHERE email = ? LIMIT 1;",
    email,
  );

  return row ? mapLocalUser(row) : null;
}

async function createLocalUserAccount(user: AppUser, password: string) {
  const database = await getDatabase();
  const existingCredential = await getLocalCredentialByEmail(user.email);
  const existingUser = await getLocalUserByEmail(user.email);

  if (existingCredential || existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashLocalPassword(password);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO users (id, email, display_name, avatar_url, role, created_at, updated_at, updated_by)
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

    await database.runAsync(
      `INSERT INTO local_auth_credentials (user_id, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      user.id,
      user.email,
      passwordHash,
      user.createdAt,
      user.updatedAt,
    );
  });

  await getUserPreferences(user.id);
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
  const credential = await getLocalCredentialByEmail(email);
  if (!credential) {
    throw new Error("No local account found for this email.");
  }

  const passwordHash = await hashLocalPassword(password);
  if (credential.password_hash !== passwordHash) {
    throw new Error("Incorrect email or password.");
  }

  const user = await getLocalUserById(credential.user_id);
  if (!user) {
    throw new Error("Local account data is missing. Create the account again.");
  }

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
  await createLocalUserAccount(user, password);
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

export async function updateProfileIdentity(
  currentUser: AppUser,
  patch: {
    displayName: string;
    avatarUrl?: string | null;
  },
) {
  const nextUser: AppUser = {
    ...currentUser,
    displayName: patch.displayName.trim(),
    avatarUrl: patch.avatarUrl ?? currentUser.avatarUrl ?? null,
    updatedAt: new Date().toISOString(),
  };

  if (env.isSupabaseConfigured && supabase) {
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: nextUser.displayName,
        avatar_url: nextUser.avatarUrl,
      },
    });

    if (authError) {
      logger.warn("profile.auth_update_failed", { message: authError.message });
    }

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: nextUser.id,
        email: nextUser.email,
        display_name: nextUser.displayName,
        avatar_url: nextUser.avatarUrl,
        role: nextUser.role,
        updated_by: nextUser.id,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      logger.warn("profile.upsert_failed", { message: upsertError.message });
    }
  }

  await persistLocalUser(nextUser);
  await writeSession(nextUser);

  return nextUser;
}

export async function logout() {
  if (env.isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }

  await clearSession();
}

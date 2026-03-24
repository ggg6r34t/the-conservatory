import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { syncOnboardingStatusToAccount } from "@/features/onboarding/services/onboardingStorage";
import {
  clearSession,
  readSession,
  writeSession,
} from "@/services/auth/sessionManager";
import { getDatabase } from "@/services/database/sqlite";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";
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

class AuthClientError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "AuthClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

let localUserWriteQueue: Promise<void> = Promise.resolve();
const deferredLocalUserPersistRuns = new Map<string, Promise<void>>();
let pendingLocalUserWriteCount = 0;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ").slice(0, 80);
}

function isLocalAuthEnabled() {
  return !env.isSupabaseConfigured && env.isDevelopmentBuild;
}

function getBackendUnavailableMessage(fallbackMessage: string) {
  const backend = getBackendConfigurationSummary();

  if (backend.mode === "release-misconfigured") {
    return backend.description;
  }

  return fallbackMessage;
}

function createAuthError(code: string, message: string, retryable = false) {
  return new AuthClientError(code, message, retryable);
}

function mapSupabaseAuthError(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return createAuthError(
      "invalid_credentials",
      "Incorrect email or password.",
    );
  }

  if (message.includes("email not confirmed")) {
    return createAuthError(
      "email_verification_required",
      "Verify your email before signing in.",
    );
  }

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already registered")
  ) {
    return createAuthError(
      "email_in_use",
      "An account with this email already exists.",
    );
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return createAuthError(
      "network_unavailable",
      "We couldn't reach the server. Check your connection and try again.",
      true,
    );
  }

  return createAuthError("auth_failed", fallbackMessage, false);
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
  } catch {
    logger.warn("auth.local_hash_fallback");
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

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("unique") || normalized.includes("constraint failed")
  );
}

function isDatabaseLockedError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("database is locked")
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withDatabaseBusyRetry<T>(
  label: string,
  operation: () => Promise<T>,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn("auth.db_operation_failed", {
        label,
        attempt: attempt + 1,
        retrying: isDatabaseLockedError(error) && attempt < 3,
      });
      if (!isDatabaseLockedError(error) || attempt === 3) {
        throw error;
      }

      await delay(80 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Database operation failed.");
}

function queueLocalUserWrite<T>(label: string, operation: () => Promise<T>) {
  const run = localUserWriteQueue
    .catch(() => undefined)
    .then(async () => {
      pendingLocalUserWriteCount += 1;
      try {
        return await operation();
      } catch (error) {
        logger.warn("auth.local_user_write.failed", { label });
        throw error;
      } finally {
        pendingLocalUserWriteCount = Math.max(
          0,
          pendingLocalUserWriteCount - 1,
        );
      }
    });

  localUserWriteQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

function hasPendingAuthPersistence() {
  return (
    pendingLocalUserWriteCount > 0 || deferredLocalUserPersistRuns.size > 0
  );
}

export async function waitForAuthPersistenceIdle(timeoutMs = 2500) {
  const startedAt = Date.now();

  while (hasPendingAuthPersistence() && Date.now() - startedAt < timeoutMs) {
    await delay(50);
  }
}

async function createLocalUserAccount(user: AppUser, password: string) {
  const database = await getDatabase();
  const existingCredential = await getLocalCredentialByEmail(user.email);
  const existingUser = await getLocalUserByEmail(user.email);

  if (existingCredential || existingUser) {
    throw createAuthError(
      "email_in_use",
      "An account with this email already exists.",
    );
  }

  const passwordHash = await hashLocalPassword(password);

  try {
    await queueLocalUserWrite("auth.create_local_user_account", () =>
      withDatabaseBusyRetry("auth.create_local_user_account", () =>
        database.withTransactionAsync(async () => {
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
        }),
      ),
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createAuthError(
        "email_in_use",
        "An account with this email already exists.",
      );
    }

    throw createAuthError(
      "local_signup_failed",
      "We couldn't create your account right now.",
      true,
    );
  }
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
    logger.warn("profile.upsert_failed");
    return user;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    if (profileError) {
      logger.warn("profile.fetch_failed");
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
  await queueLocalUserWrite("auth.persist_local_user", () =>
    withDatabaseBusyRetry("auth.persist_local_user", () =>
      database.runAsync(
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
      ),
    ),
  );
}

async function persistLocalUserDeferred(user: AppUser) {
  const existingRun = deferredLocalUserPersistRuns.get(user.id);
  if (existingRun) {
    return existingRun;
  }

  const run = (async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        if (attempt > 0) {
          await delay(400 * attempt);
        }

        await persistLocalUser(user);
        return;
      } catch (error) {
        const locked = isDatabaseLockedError(error);
        logger.warn("auth.persist_local_user_deferred.failed", {
          attempt: attempt + 1,
          retrying: locked && attempt < 3,
        });

        if (!locked || attempt === 3) {
          throw error;
        }
      }
    }
  })().finally(() => {
    if (deferredLocalUserPersistRuns.get(user.id) === run) {
      deferredLocalUserPersistRuns.delete(user.id);
    }
  });

  deferredLocalUserPersistRuns.set(user.id, run);
  return run;
}

async function persistLocalUserForAuth(user: AppUser) {
  try {
    await persistLocalUser(user);
  } catch (error) {
    if (!isDatabaseLockedError(error)) {
      throw error;
    }

    logger.warn("auth.persist_local_user_deferred");
    void persistLocalUserDeferred(user).catch(() => {
      logger.warn("auth.persist_local_user_deferred.exhausted");
    });
  }
}

async function finalizeAuthenticatedUser(user: AppUser) {
  await syncOnboardingStatusToAccount(user.id);
  await writeSession(user);
  return user;
}

export async function getInitialAuthUser() {
  if (env.isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.warn("auth.restore.session_failed");
        await clearSession();
        return null;
      }

      if (!data.session?.user) {
        await clearSession();
        return null;
      }

      const user = createSupabaseUser(
        data.session.user.id,
        normalizeEmail(data.session.user.email ?? "botanist@conservatory.com"),
        data.session.user.user_metadata.display_name,
        data.session.user.user_metadata.avatar_url,
      );
      const syncedProfile = await syncRemoteProfile(user);
      return finalizeAuthenticatedUser(syncedProfile);
    } catch {
      logger.warn("auth.restore.failed");
      await clearSession();
      return null;
    }
  }

  if (!isLocalAuthEnabled()) {
    await clearSession();
    return null;
  }

  return readSession();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  if (env.isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      throw mapSupabaseAuthError(error, "Unable to sign in right now.");
    }

    const user = createSupabaseUser(
      data.user.id,
      normalizedEmail,
      data.user.user_metadata.display_name,
      data.user.user_metadata.avatar_url,
    );
    const syncedProfile = await syncRemoteProfile(user);
    await finalizeAuthenticatedUser(syncedProfile);
    return { user: syncedProfile, requiresEmailVerification: false };
  }

  if (!isLocalAuthEnabled()) {
    throw createAuthError(
      "auth_unavailable",
      getBackendUnavailableMessage(
        "Sign-in isn't available in this build right now.",
      ),
    );
  }

  const credential = await getLocalCredentialByEmail(normalizedEmail);
  if (!credential) {
    throw createAuthError(
      "invalid_credentials",
      "Incorrect email or password.",
    );
  }

  const passwordHash = await hashLocalPassword(password);
  if (credential.password_hash !== passwordHash) {
    throw createAuthError(
      "invalid_credentials",
      "Incorrect email or password.",
    );
  }

  const user = await getLocalUserById(credential.user_id);
  if (!user) {
    throw createAuthError(
      "account_missing",
      "We couldn't restore this account. Try signing in again.",
      true,
    );
  }

  await finalizeAuthenticatedUser(user);
  return { user, requiresEmailVerification: false };
}

export async function signup(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName = normalizeDisplayName(displayName);

  if (env.isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { display_name: normalizedDisplayName } },
    });

    if (error || !data.user) {
      throw mapSupabaseAuthError(
        error,
        "Unable to create your account right now.",
      );
    }

    const user = createSupabaseUser(
      data.user.id,
      normalizedEmail,
      normalizedDisplayName,
      data.user.user_metadata.avatar_url,
    );
    const syncedProfile = await syncRemoteProfile(user);
    if (data.session) {
      await finalizeAuthenticatedUser(syncedProfile);
    }
    return { user: syncedProfile, requiresEmailVerification: !data.session };
  }

  if (!isLocalAuthEnabled()) {
    throw createAuthError(
      "signup_unavailable",
      getBackendUnavailableMessage(
        "Account creation isn't available in this build right now.",
      ),
    );
  }

  const user = createLocalUser(normalizedEmail, normalizedDisplayName);
  await createLocalUserAccount(user, password);
  await finalizeAuthenticatedUser(user);
  return { user, requiresEmailVerification: false };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (env.isSupabaseConfigured && supabase) {
    const { error } =
      await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (error) {
      throw mapSupabaseAuthError(
        error,
        "We couldn't start password recovery right now.",
      );
    }
    return;
  }

  if (!isLocalAuthEnabled()) {
    throw createAuthError(
      "password_reset_unavailable",
      getBackendUnavailableMessage(
        "Password recovery isn't available in this build right now.",
      ),
    );
  }

  throw createAuthError(
    "password_reset_local_only",
    "This build is running in local-only mode, so email password reset delivery is unavailable.",
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
    displayName: normalizeDisplayName(patch.displayName),
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
      logger.warn("profile.auth_update_failed");
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
      logger.warn("profile.upsert_failed");
    }
  }

  await persistLocalUser(nextUser);
  await writeSession(nextUser);

  return nextUser;
}

export async function logout() {
  if (env.isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      logger.warn("auth.logout.remote_failed");
    }
  }

  await clearSession();
}

export { AuthClientError };

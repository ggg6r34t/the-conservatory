const mockWriteSession = jest.fn().mockResolvedValue(undefined);
const mockReadSession = jest.fn().mockResolvedValue(null);
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockGetUserPreferences = jest.fn().mockResolvedValue(undefined);
const mockDigestStringAsync = jest.fn(
  async (_algorithm: string, value: string) => `hash:${value}`,
);
const mockGetDatabase = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: false,
    isDevelopmentBuild: true,
    isProductionBuild: false,
    missingSupabaseConfig: [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ],
    supabaseUrl: null,
    supabaseAnonKey: null,
    enableSyncTrials: false,
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: null,
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
  },
  digestStringAsync: (algorithm: string, value: string) =>
    mockDigestStringAsync(algorithm, value),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
}));

jest.mock("@/services/auth/sessionManager", () => ({
  writeSession: (...args: unknown[]) => mockWriteSession(...args),
  readSession: (...args: unknown[]) => mockReadSession(...args),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
}));

describe("auth client local fallback", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    const users = new Map<
      string,
      {
        id: string;
        email: string;
        display_name: string;
        avatar_url: string | null;
        role: "user" | "admin";
        created_at: string;
        updated_at: string;
      }
    >();
    const credentials = new Map<
      string,
      {
        user_id: string;
        email: string;
        password_hash: string;
      }
    >();

    mockGetDatabase.mockResolvedValue({
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
      runAsync: async (sql: string, ...params: unknown[]) => {
        if (sql.includes("INSERT INTO users")) {
          users.set(params[1] as string, {
            id: params[0] as string,
            email: params[1] as string,
            display_name: params[2] as string,
            avatar_url: params[3] as string | null,
            role: params[4] as "user" | "admin",
            created_at: params[5] as string,
            updated_at: params[6] as string,
          });
          return;
        }

        if (sql.includes("INSERT INTO local_auth_credentials")) {
          credentials.set(params[1] as string, {
            user_id: params[0] as string,
            email: params[1] as string,
            password_hash: params[2] as string,
          });
        }
      },
      getFirstAsync: async (sql: string, param: string) => {
        if (sql.includes("local_auth_credentials")) {
          return credentials.get(param) ?? null;
        }

        if (sql.includes("WHERE id = ?")) {
          for (const user of users.values()) {
            if (user.id === param) {
              return user;
            }
          }
          return null;
        }

        if (sql.includes("WHERE email = ?")) {
          return users.get(param) ?? null;
        }

        return null;
      },
    });
  });

  it("creates a persisted local account and signs in with the stored password hash", async () => {
    const { login, signup } = require("@/features/auth/api/authClient");

    const signupResult = await signup(
      "curator@example.com",
      "fern-secret",
      "Fern Curator",
    );
    const loginResult = await login("curator@example.com", "fern-secret");

    expect(signupResult.user.email).toBe("curator@example.com");
    expect(loginResult.user.id).toBe(signupResult.user.id);
    expect(mockWriteSession).toHaveBeenCalledWith(
      expect.objectContaining({ email: "curator@example.com" }),
    );
  });

  it("rejects invalid local credentials instead of creating a fallback account", async () => {
    const { signup, login } = require("@/features/auth/api/authClient");

    await signup("curator@example.com", "fern-secret", "Fern Curator");

    await expect(
      login("curator@example.com", "wrong-password"),
    ).rejects.toThrow("Incorrect email or password.");
    await expect(login("missing@example.com", "fern-secret")).rejects.toThrow(
      "Incorrect email or password.",
    );
  });

  it("returns a friendly duplicate-email error when local signup hits a uniqueness conflict", async () => {
    let usersInsertAttempts = 0;

    mockGetDatabase.mockResolvedValue({
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
      runAsync: async (sql: string) => {
        if (sql.includes("INSERT INTO users")) {
          usersInsertAttempts += 1;
          if (usersInsertAttempts > 1) {
            throw new Error("UNIQUE constraint failed: users.email");
          }
        }
      },
      getFirstAsync: async () => null,
    });

    const { signup } = require("@/features/auth/api/authClient");

    await signup("curator@example.com", "fern-secret", "Fern Curator");

    await expect(
      signup("curator@example.com", "fern-secret", "Fern Curator"),
    ).rejects.toThrow("An account with this email already exists.");
  });

  it("restores the local session only in explicit dev or test auth mode", async () => {
    mockReadSession.mockResolvedValue({
      id: "local-user",
      email: "curator@example.com",
      displayName: "Fern Curator",
      role: "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { getInitialAuthUser } = require("@/features/auth/api/authClient");

    await expect(getInitialAuthUser()).resolves.toEqual(
      expect.objectContaining({ id: "local-user" }),
    );
  });
});

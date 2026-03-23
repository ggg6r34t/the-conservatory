import {
  mockSupabaseClient,
  mockSupabaseAuth,
  mockSupabaseUsersTable,
  resetSupabaseMocks,
} from "@/tests/__mocks__/supabase";

const mockWriteSession = jest.fn().mockResolvedValue(undefined);
const mockReadSession = jest.fn().mockResolvedValue(null);
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockSyncOnboardingStatusToAccount = jest.fn().mockResolvedValue("completed");

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: mockSupabaseClient,
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn().mockResolvedValue({
    runAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/auth/sessionManager", () => ({
  writeSession: (...args: unknown[]) => mockWriteSession(...args),
  readSession: (...args: unknown[]) => mockReadSession(...args),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
}));

jest.mock("@/features/onboarding/services/onboardingStorage", () => ({
  syncOnboardingStatusToAccount: (...args: unknown[]) =>
    mockSyncOnboardingStatusToAccount(...args),
}));

describe("auth client supabase mapping", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    jest.clearAllMocks();
  });

  it("should map Supabase user id and sync profile on login", async () => {
    const profileQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          display_name: "Elowen Thorne",
          avatar_url: null,
          role: "user",
        },
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table?: string) => {
      if (table === "users") {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
          ...profileQueryBuilder,
        };
      }

      return mockSupabaseUsersTable;
    });

    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: {
            display_name: "Elowen",
            avatar_url: null,
          },
        },
      },
      error: null,
    });

    const { login } = require("@/features/auth/api/authClient");
    const result = await login("elowen@garden.io", "secret123");

    expect(result.user.id).toBe("user-123");
    expect(result.user.displayName).toBe("Elowen Thorne");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
    expect(mockWriteSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-123" }),
    );
  });

  it("clears stale secure-store state when no Supabase session exists", async () => {
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { getInitialAuthUser } = require("@/features/auth/api/authClient");

    await expect(getInitialAuthUser()).resolves.toBeNull();
    expect(mockClearSession).toHaveBeenCalled();
  });

  it("maps invalid Supabase credentials to a safe user-facing error", async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid login credentials"),
    });

    const { login } = require("@/features/auth/api/authClient");

    await expect(login("elowen@garden.io", "bad-password")).rejects.toThrow(
      "Incorrect email or password.",
    );
  });
});

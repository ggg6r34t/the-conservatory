import {
  mockSupabaseClient,
  mockSupabaseAuth,
  mockSupabaseUsersTable,
  resetSupabaseMocks,
} from "@/tests/__mocks__/supabase";

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
  writeSession: jest.fn().mockResolvedValue(undefined),
  readSession: jest.fn().mockResolvedValue(null),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

describe("auth client supabase mapping", () => {
  beforeEach(() => {
    resetSupabaseMocks();
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
  });
});

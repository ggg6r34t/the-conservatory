const mockFunctionsInvoke = jest.fn();
const mockAuthSignOut = jest.fn();

jest.mock("@/config/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockFunctionsInvoke(...args) },
    auth: { signOut: (...args: unknown[]) => mockAuthSignOut(...args) },
  },
}));

const mockExecAsync = jest.fn();
const mockGetDatabase = jest.fn();
jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

const mockClearSession = jest.fn();
jest.mock("@/services/auth/sessionManager", () => ({
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  readSession: jest.fn().mockResolvedValue(null),
  writeSession: jest.fn().mockResolvedValue(undefined),
}));

// Stub out modules that authClient imports but are not relevant to deleteAccount
jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
    isDevelopmentBuild: false,
    isProductionBuild: true,
    missingSupabaseConfig: [],
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    enableSyncTrials: false,
  },
}));

jest.mock("@/features/onboarding/services/onboardingStorage", () => ({
  syncOnboardingStatusToAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: jest
    .fn()
    .mockReturnValue({ mode: "configured", description: "OK" }),
}));

describe("deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue({ execAsync: mockExecAsync });
    mockExecAsync.mockResolvedValue(undefined);
    mockFunctionsInvoke.mockResolvedValue({ error: null });
    mockAuthSignOut.mockResolvedValue({});
    mockClearSession.mockResolvedValue(undefined);
  });

  it("invokes the delete-account edge function", async () => {
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await deleteAccount();
    expect(mockFunctionsInvoke).toHaveBeenCalledWith("delete-account", {});
  });

  it("clears all local user data after successful remote deletion", async () => {
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await deleteAccount();
    expect(mockExecAsync).toHaveBeenCalled();
    // verify key tables are included in the clear
    const allCalls = mockExecAsync.mock.calls.flat().join(" ");
    expect(allCalls).toContain("care_logs");
    expect(allCalls).toContain("plants");
    expect(allCalls).toContain("users");
  });

  it("calls clearSession after clearing local data", async () => {
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await deleteAccount();
    expect(mockClearSession).toHaveBeenCalled();
  });

  it("throws if the edge function returns an error", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      error: { message: "Remote deletion failed" },
    });
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await expect(deleteAccount()).rejects.toThrow("Remote deletion failed");
  });

  it("does not clear local data if edge function fails", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      error: { message: "Server error" },
    });
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await expect(deleteAccount()).rejects.toThrow();
    expect(mockExecAsync).not.toHaveBeenCalled();
  });

  it("does not call clearSession if edge function fails", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      error: { message: "Server error" },
    });
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await expect(deleteAccount()).rejects.toThrow();
    expect(mockClearSession).not.toHaveBeenCalled();
  });
});

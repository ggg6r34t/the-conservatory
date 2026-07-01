import {
  mockSupabaseAuth,
  mockSupabaseClient,
  resetSupabaseMocks,
} from "@/tests/__mocks__/supabase";

const mockWriteSession = jest.fn().mockResolvedValue(undefined);
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockMarkPasswordRecoveryPending = jest.fn().mockResolvedValue(undefined);
const mockClearPasswordRecoveryPending = jest.fn().mockResolvedValue(undefined);
const mockIsPasswordRecoveryPending = jest.fn().mockResolvedValue(false);
const mockTrackGtmEvent = jest.fn();

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
    isDevelopmentBuild: false,
    isProductionBuild: true,
    missingSupabaseConfig: [],
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: mockSupabaseClient,
}));

jest.mock("@/services/auth/sessionManager", () => ({
  writeSession: (...args: unknown[]) => mockWriteSession(...args),
  readSession: jest.fn().mockResolvedValue(null),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
}));

jest.mock("@/services/auth/passwordRecoveryState", () => ({
  markPasswordRecoveryPending: (...args: unknown[]) =>
    mockMarkPasswordRecoveryPending(...args),
  clearPasswordRecoveryPending: (...args: unknown[]) =>
    mockClearPasswordRecoveryPending(...args),
  isPasswordRecoveryPending: (...args: unknown[]) =>
    mockIsPasswordRecoveryPending(...args),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackGtmEvent: (...args: unknown[]) => mockTrackGtmEvent(...args),
}));

describe("auth client password reset", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    jest.clearAllMocks();
    mockIsPasswordRecoveryPending.mockResolvedValue(true);
  });

  it("requests password reset with redirect URL and neutral analytics", async () => {
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

    const { requestPasswordReset } = require("@/features/auth/api/authClient");
    await requestPasswordReset(" Curator@Example.com ");

    expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      "curator@example.com",
      { redirectTo: "https://theconservatory.app/auth/reset-password" },
    );
    expect(mockTrackGtmEvent).toHaveBeenCalledWith("password_reset_requested");
    expect(mockTrackGtmEvent).toHaveBeenCalledWith(
      "password_reset_request_succeeded",
    );
  });

  it("maps rate limit failures to safe analytics reasons", async () => {
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
      error: new Error("email rate limit exceeded"),
    });

    const { requestPasswordReset, AuthClientError } =
      require("@/features/auth/api/authClient");

    await expect(requestPasswordReset("curator@example.com")).rejects.toMatchObject(
      {
        code: "rate_limited",
      },
    );

    expect(mockTrackGtmEvent).toHaveBeenCalledWith(
      "password_reset_request_failed",
      { reason: "rate_limited" },
    );
    expect(AuthClientError).toBeDefined();
  });

  it("establishes recovery sessions from token payloads", async () => {
    mockSupabaseAuth.setSession.mockResolvedValue({ error: null });
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    const { establishPasswordRecoverySession } =
      require("@/features/auth/api/authClient");

    await establishPasswordRecoverySession({
      kind: "tokens",
      accessToken: "access",
      refreshToken: "refresh",
    });

    expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
    expect(mockMarkPasswordRecoveryPending).toHaveBeenCalled();
    expect(mockTrackGtmEvent).toHaveBeenCalledWith("password_reset_link_opened");
  });

  it("updates password from recovery and signs out", async () => {
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    mockSupabaseAuth.updateUser.mockResolvedValue({ error: null });
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

    const { updatePasswordFromRecovery } =
      require("@/features/auth/api/authClient");

    await updatePasswordFromRecovery("FreshPass1");

    expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
      password: "FreshPass1",
    });
    expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    expect(mockClearPasswordRecoveryPending).toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockTrackGtmEvent).toHaveBeenCalledWith("password_update_succeeded");
  });

  it("blocks password update without recovery session", async () => {
    mockIsPasswordRecoveryPending.mockResolvedValue(false);
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { updatePasswordFromRecovery } =
      require("@/features/auth/api/authClient");

    await expect(updatePasswordFromRecovery("FreshPass1")).rejects.toMatchObject(
      { code: "expired_link" },
    );
  });

  it("reports when password recovery should resume after restart", async () => {
    mockIsPasswordRecoveryPending.mockResolvedValue(true);
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    const { shouldResumePasswordRecovery } =
      require("@/features/auth/api/authClient");

    await expect(shouldResumePasswordRecovery()).resolves.toBe(true);
  });
});

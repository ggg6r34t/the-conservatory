import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";
import { processPasswordRecoveryUrl } from "@/features/auth/services/processPasswordRecoveryUrl";

const mockEstablishPasswordRecoverySession = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock("@/features/auth/api/authClient", () => ({
  AuthClientError: class AuthClientError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  establishPasswordRecoverySession: (...args: unknown[]) =>
    mockEstablishPasswordRecoverySession(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

describe("processPasswordRecoveryUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePasswordRecoveryStore.setState({
      isActive: false,
      linkErrorCode: null,
    });
    mockEstablishPasswordRecoverySession.mockResolvedValue(undefined);
  });

  it("ignores unrelated deep links", async () => {
    const handled = await processPasswordRecoveryUrl(
      "theconservatory://plant/add?plantId=abc",
    );

    expect(handled).toBe(false);
    expect(mockEstablishPasswordRecoverySession).not.toHaveBeenCalled();
  });

  it("establishes recovery sessions for valid recovery links", async () => {
    const handled = await processPasswordRecoveryUrl(
      "theconservatory://auth/reset-password#access_token=abc&refresh_token=def&type=recovery",
    );

    expect(handled).toBe(true);
    expect(mockEstablishPasswordRecoverySession).toHaveBeenCalledWith({
      kind: "tokens",
      accessToken: "abc",
      refreshToken: "def",
    });
    expect(usePasswordRecoveryStore.getState().isActive).toBe(true);
  });

  it("surfaces invalid recovery links without tokens", async () => {
    const handled = await processPasswordRecoveryUrl(
      "https://theconservatory.app/auth/reset-password",
    );

    expect(handled).toBe(true);
    expect(mockEstablishPasswordRecoverySession).not.toHaveBeenCalled();
    expect(usePasswordRecoveryStore.getState().linkErrorCode).toBe("invalid_link");
  });
});

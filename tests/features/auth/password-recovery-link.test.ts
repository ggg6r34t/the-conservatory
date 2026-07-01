import {
  isPasswordRecoveryUrl,
  parsePasswordRecoveryUrl,
} from "@/features/auth/services/passwordRecoveryLink";

describe("passwordRecoveryLink", () => {
  it("recognizes native recovery URLs", () => {
    expect(
      isPasswordRecoveryUrl(
        "theconservatory://auth/reset-password#access_token=abc&refresh_token=def&type=recovery",
      ),
    ).toBe(true);
  });

  it("recognizes web recovery URLs", () => {
    expect(
      isPasswordRecoveryUrl(
        "https://theconservatory.garden/auth/reset-password?code=pkce-code",
      ),
    ).toBe(true);
  });

  it("rejects unrelated URLs", () => {
    expect(isPasswordRecoveryUrl("theconservatory://plant/add")).toBe(false);
    expect(isPasswordRecoveryUrl("https://example.com/auth/reset-password")).toBe(
      false,
    );
    expect(
      isPasswordRecoveryUrl("https://theconservatory.garden/login#type=recovery"),
    ).toBe(false);
  });

  it("rejects non-recovery auth token links", () => {
    expect(
      parsePasswordRecoveryUrl(
        "theconservatory://auth/reset-password#access_token=abc&refresh_token=def&type=signup",
      ),
    ).toBeNull();
  });

  it("parses hash recovery tokens", () => {
    expect(
      parsePasswordRecoveryUrl(
        "theconservatory://auth/reset-password#access_token=abc&refresh_token=def&type=recovery",
      ),
    ).toEqual({
      kind: "tokens",
      accessToken: "abc",
      refreshToken: "def",
    });
  });

  it("parses PKCE recovery codes", () => {
    expect(
      parsePasswordRecoveryUrl(
        "https://theconservatory.garden/auth/reset-password?code=pkce-code",
      ),
    ).toEqual({
      kind: "code",
      code: "pkce-code",
    });
  });

  it("returns null for recovery path without credentials", () => {
    expect(
      parsePasswordRecoveryUrl("https://theconservatory.garden/auth/reset-password"),
    ).toBeNull();
  });
});

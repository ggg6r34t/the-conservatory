import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

describe("password reset certification", () => {
  it("registers auth recovery routes and bridge wiring", () => {
    expect(exists("app/(auth)/forgot-password.tsx")).toBe(true);
    expect(exists("app/(auth)/reset-password.tsx")).toBe(true);
    expect(read("app/(auth)/_layout.tsx")).toContain('name="reset-password"');
    expect(read("providers/Providers.tsx")).toContain("PasswordRecoveryBridge");
    expect(read("app/_layout.tsx")).toContain("isResetPasswordRoute");
    expect(read("app/_layout.tsx")).toContain("passwordRecoveryActive");
  });

  it("uses Supabase reset redirect and recovery update APIs", () => {
    const authClient = read("features/auth/api/authClient.ts");
    expect(authClient).toContain("resetPasswordForEmail");
    expect(authClient).toContain("PASSWORD_RECOVERY_REDIRECT_URL");
    expect(authClient).toContain("updatePasswordFromRecovery");
    expect(authClient).toContain("shouldResumePasswordRecovery");
    expect(authClient).toContain('trackGtmEvent("password_reset_requested")');
    expect(authClient).toContain('trackGtmEvent("password_update_succeeded")');
  });

  it("configures mobile deep link and universal link handlers", () => {
    const appConfig = read("app.config.js");
    expect(appConfig).toContain("applinks:theconservatory.app");
    expect(appConfig).toContain("applinks:theconservatory.garden");
    expect(appConfig).toContain('pathPrefix: "/auth/reset-password"');
    expect(read("features/auth/services/passwordRecoveryLink.ts")).toContain(
      "parsePasswordRecoveryUrl",
    );
    expect(read("features/auth/services/processPasswordRecoveryUrl.ts")).toContain(
      "processPasswordRecoveryUrl",
    );
  });

  it("documents hosted Supabase redirect configuration", () => {
    expect(exists("docs/engineering/PASSWORD_RESET_SUPABASE_CONFIG.md")).toBe(
      true,
    );
    expect(read("docs/engineering/PASSWORD_RESET_SUPABASE_CONFIG.md")).toContain(
      "theconservatory://auth/reset-password",
    );
  });

  it("does not use native Alert in auth recovery screens", () => {
    expect(read("app/(auth)/forgot-password.tsx")).not.toContain("Alert.alert");
    expect(read("app/(auth)/reset-password.tsx")).not.toContain("Alert.alert");
    expect(read("app/(auth)/forgot-password.tsx")).toContain("useAlert");
    expect(read("app/(auth)/reset-password.tsx")).toContain("useAlert");
  });
});

import fs from "fs";
import path from "path";

describe("profile subscription management access", () => {
  it("keeps Manage Subscription visible without gating it to current premium state", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "profile.tsx"),
      "utf8",
    );
    const manageIndex = source.indexOf('label="Manage Subscription"');
    const accountSection = source.indexOf("ACCOUNT");
    const privacyIndex = source.indexOf('label="Privacy & Security"');
    const precedingWindow = source.slice(
      Math.max(0, manageIndex - 160),
      manageIndex,
    );

    expect(manageIndex).toBeGreaterThan(accountSection);
    expect(manageIndex).toBeLessThan(privacyIndex);
    expect(precedingWindow).not.toContain("isPremium ?");
  });
});

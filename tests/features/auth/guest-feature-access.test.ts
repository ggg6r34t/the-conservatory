import {
  canUseFeatureAsGuest,
  getAccountRequiredCopy,
} from "@/features/auth/services/guestFeatureAccess";

describe("guestFeatureAccess", () => {
  it("allows local features for guests", () => {
    expect(canUseFeatureAsGuest("cloud_sync", { isGuest: false }).canUse).toBe(
      true,
    );
    expect(
      canUseFeatureAsGuest("cloud_backup", { isGuest: true }).canUse,
    ).toBe(false);
    expect(canUseFeatureAsGuest("cloud_backup", { isGuest: true }).reason).toBe(
      "requires_account",
    );
  });

  it("requires account for premium purchase", () => {
    expect(
      canUseFeatureAsGuest("premium_purchase", { isGuest: true }).canUse,
    ).toBe(false);
  });

  it("requires account for premium restore", () => {
    expect(
      canUseFeatureAsGuest("premium_restore", { isGuest: true }).canUse,
    ).toBe(false);
  });

  it("returns calm account-required copy", () => {
    expect(getAccountRequiredCopy("cloud_backup").title).toContain(
      "Create an account",
    );
    expect(getAccountRequiredCopy("cloud_ai").message).not.toMatch(/lose|urgent/i);
  });
});

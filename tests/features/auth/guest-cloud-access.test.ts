import { resolveGuestCloudAllowed } from "@/features/auth/services/guestFeatureAccess";

describe("resolveGuestCloudAllowed", () => {
  it("blocks cloud access for guests even when premium", () => {
    expect(resolveGuestCloudAllowed(true, true)).toBe(false);
  });

  it("allows cloud access for authenticated premium users", () => {
    expect(resolveGuestCloudAllowed(false, true)).toBe(true);
  });
});

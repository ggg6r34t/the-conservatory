import { resolveEntryRoute } from "@/features/onboarding/utils/resolveEntryRoute";

describe("resolveEntryRoute guest mode", () => {
  it("routes guests to tabs after onboarding", () => {
    expect(
      resolveEntryRoute({
        authStatus: "guest",
        onboardingStatus: "completed",
      }),
    ).toBe("/(tabs)");
  });

  it("routes anonymous completed onboarding users to login", () => {
    expect(
      resolveEntryRoute({
        authStatus: "anonymous",
        onboardingStatus: "completed",
      }),
    ).toBe("/(auth)/login");
  });
});

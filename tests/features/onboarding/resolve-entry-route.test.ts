import {
  resolveEntryRoute,
  resolveSafeAuthRedirectTarget,
} from "@/features/onboarding/utils/resolveEntryRoute";

describe("resolveEntryRoute", () => {
  it("sends authenticated users into the tab app", () => {
    expect(
      resolveEntryRoute({
        authStatus: "authenticated",
        onboardingStatus: "pending",
      }),
    ).toBe("/(tabs)");
  });

  it("sends signed-out users who finished onboarding to login", () => {
    expect(
      resolveEntryRoute({
        authStatus: "anonymous",
        onboardingStatus: "completed",
      }),
    ).toBe("/(auth)/login");
  });

  it("keeps first-time users on the welcome gateway", () => {
    expect(
      resolveEntryRoute({
        authStatus: "anonymous",
        onboardingStatus: "pending",
      }),
    ).toBe("/");
  });

  it("allows only known post-auth redirect targets", () => {
    expect(resolveSafeAuthRedirectTarget("/plant/add")).toBe("/plant/add");
    expect(resolveSafeAuthRedirectTarget("/(tabs)")).toBe("/(tabs)");
    expect(resolveSafeAuthRedirectTarget("/profile")).toBe("/(tabs)");
    expect(resolveSafeAuthRedirectTarget(["/plant/add"])).toBe("/(tabs)");
    expect(resolveSafeAuthRedirectTarget(undefined)).toBe("/(tabs)");
  });
});

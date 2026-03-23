import { resolveWalkthroughTarget } from "@/features/onboarding/utils/resolveWalkthroughTarget";

describe("resolveWalkthroughTarget", () => {
  it("advances gallery to care rhythm", () => {
    expect(resolveWalkthroughTarget("gallery", "next")).toBe("next-slide");
  });

  it("advances care rhythm to graveyard", () => {
    expect(resolveWalkthroughTarget("care-rhythm", "next")).toBe("next-slide");
  });

  it("advances the final walkthrough slide to permissions", () => {
    expect(resolveWalkthroughTarget("graveyard", "next")).toBe("/onboarding/permissions");
  });

  it("skips any walkthrough slide to permissions", () => {
    expect(resolveWalkthroughTarget("gallery", "skip")).toBe("/onboarding/permissions");
    expect(resolveWalkthroughTarget("care-rhythm", "skip")).toBe("/onboarding/permissions");
  });
});

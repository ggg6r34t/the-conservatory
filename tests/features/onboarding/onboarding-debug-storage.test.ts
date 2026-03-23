jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  getOnboardingDebugSnapshot,
  markOnboardingAction,
  markOnboardingCompletedAt,
  markPermissionsViewed,
  markQuickStartViewed,
  markWalkthroughSlideViewed,
  markWelcomeViewed,
  resetOnboardingDebugSnapshot,
} from "@/features/onboarding/services/onboardingDebugStorage";

describe("onboardingDebugStorage", () => {
  beforeEach(async () => {
    const storage = require("@react-native-async-storage/async-storage");
    await storage.clear();
  });

  it("defaults to an empty snapshot", async () => {
    await expect(getOnboardingDebugSnapshot()).resolves.toMatchObject({
      status: "pending",
      slideViewCount: 0,
      viewedSlides: [],
      completedAt: null,
    });
  });

  it("tracks viewed onboarding surfaces and actions", async () => {
    await markWelcomeViewed("2026-03-23T10:00:00.000Z");
    await markWalkthroughSlideViewed("gallery", "2026-03-23T10:01:00.000Z");
    await markWalkthroughSlideViewed("care-rhythm", "2026-03-23T10:02:00.000Z");
    await markPermissionsViewed("2026-03-23T10:03:00.000Z");
    await markQuickStartViewed("2026-03-23T10:04:00.000Z");
    await markOnboardingAction("walkthrough_next_gallery", "2026-03-23T10:05:00.000Z");
    await markOnboardingCompletedAt("2026-03-23T10:06:00.000Z");

    await expect(getOnboardingDebugSnapshot()).resolves.toMatchObject({
      slideViewCount: 2,
      viewedSlides: ["gallery", "care-rhythm"],
      lastViewedSlide: "care-rhythm",
      lastAction: "walkthrough_next_gallery",
      completedAt: "2026-03-23T10:06:00.000Z",
    });
  });

  it("resets the debug snapshot", async () => {
    await markWelcomeViewed("2026-03-23T10:00:00.000Z");
    await resetOnboardingDebugSnapshot();

    await expect(getOnboardingDebugSnapshot()).resolves.toMatchObject({
      slideViewCount: 0,
      viewedSlides: [],
      welcomeViewedAt: null,
    });
  });
});

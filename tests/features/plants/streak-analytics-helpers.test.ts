import {
  classifyCareLogStreakEvent,
  resolveStreakTimeZone,
  shouldTrackStreakBroken,
} from "@/features/plants/services/streakAnalyticsHelpers";

describe("streakAnalyticsHelpers", () => {
  describe("resolveStreakTimeZone", () => {
    it("prefers the user timezone when provided", () => {
      expect(resolveStreakTimeZone("America/New_York")).toBe("America/New_York");
    });

    it("falls back to the device timezone when preference is blank", () => {
      const resolved = resolveStreakTimeZone("   ");
      expect(resolved.length).toBeGreaterThan(0);
    });
  });

  describe("classifyCareLogStreakEvent", () => {
    it("classifies a first streak start", () => {
      expect(
        classifyCareLogStreakEvent({
          beforeCurrent: 0,
          afterCurrent: 1,
          beforeLongest: 0,
        }),
      ).toBe("streak_started");
    });

    it("classifies a streak recovery after a prior best run", () => {
      expect(
        classifyCareLogStreakEvent({
          beforeCurrent: 0,
          afterCurrent: 1,
          beforeLongest: 5,
        }),
      ).toBe("streak_recovered");
    });

    it("classifies a streak extension", () => {
      expect(
        classifyCareLogStreakEvent({
          beforeCurrent: 2,
          afterCurrent: 3,
          beforeLongest: 3,
        }),
      ).toBe("streak_extended");
    });

    it("classifies same-day maintenance", () => {
      expect(
        classifyCareLogStreakEvent({
          beforeCurrent: 4,
          afterCurrent: 4,
          beforeLongest: 4,
        }),
      ).toBe("streak_maintained");
    });

    it("returns null when no analytics event applies", () => {
      expect(
        classifyCareLogStreakEvent({
          beforeCurrent: 0,
          afterCurrent: 0,
          beforeLongest: 0,
        }),
      ).toBeNull();
    });
  });

  describe("shouldTrackStreakBroken", () => {
    it("tracks a break when streak drops from positive to zero", () => {
      expect(
        shouldTrackStreakBroken({
          previousCurrent: 3,
          currentStreak: 0,
          isLoading: false,
        }),
      ).toBe(true);
    });

    it("skips the first session observation", () => {
      expect(
        shouldTrackStreakBroken({
          previousCurrent: null,
          currentStreak: 0,
          isLoading: false,
        }),
      ).toBe(false);
    });

    it("skips while loading", () => {
      expect(
        shouldTrackStreakBroken({
          previousCurrent: 3,
          currentStreak: 0,
          isLoading: true,
        }),
      ).toBe(false);
    });
  });
});

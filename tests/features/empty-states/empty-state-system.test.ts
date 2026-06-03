import {
  getDashboardHeroCopyForCollection,
  getEmptyStateForContext,
  getHydrationCardCopy,
} from "@/features/empty-states/getEmptyStateForContext";
import { emptyStateCopyRegistry } from "@/features/empty-states/emptyStateCopyRegistry";

describe("empty state copy registry", () => {
  it("defines copy for every context key", () => {
    const keys = Object.keys(emptyStateCopyRegistry);
    expect(keys.length).toBeGreaterThan(30);
    for (const key of keys) {
      const content = emptyStateCopyRegistry[key as keyof typeof emptyStateCopyRegistry];
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.body.length).toBeGreaterThan(0);
      expect(content.analyticsKey.length).toBeGreaterThan(0);
    }
  });

  it("avoids misleading collection-health phrases in first-run dashboard copy", () => {
    const hero = getDashboardHeroCopyForCollection({
      totalPlants: 0,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 0,
      activeReminders: 0,
    });
    const hydration = getHydrationCardCopy({
      totalPlants: 0,
      dueToday: 0,
      overdue: 0,
      nextCycleHours: null,
    });

    expect(hero.isFirstRun).toBe(true);
    expect(hero.body).not.toMatch(/lush|hydrated|welcome back|specimens/i);
    expect(hydration.statusCopy).not.toMatch(/hydrated|specimens/i);
  });
});

describe("dashboard hero copy", () => {
  it("returns first-run guidance when collection is empty", () => {
    const copy = getDashboardHeroCopyForCollection({
      totalPlants: 0,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 0,
      activeReminders: 0,
    });

    expect(copy.eyebrow).toBe("YOUR LIVING GALLERY");
    expect(copy.titleLines).toEqual(["Garden is", "starting."]);
    expect(copy.body).toContain("Add your first plant");
    expect(copy.primaryActionLabel).toBe("Add first plant");
  });

  it("uses settled copy when plants exist and none need care", () => {
    const copy = getDashboardHeroCopyForCollection({
      totalPlants: 5,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 0,
      activeReminders: 2,
    });

    expect(copy.titleLines).toEqual(["Garden is", "steady."]);
    expect(copy.body).toContain("Everything is settled for today.");
    expect(copy.body).not.toMatch(/lush|welcome back/i);
  });

  it("flags reminder pause when no active reminders", () => {
    const copy = getDashboardHeroCopyForCollection({
      totalPlants: 3,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 2,
      activeReminders: 0,
    });

    expect(copy.body).toContain("No reminders are active yet.");
  });
});

describe("hydration card copy", () => {
  it("shows first-run guidance when there are no plants", () => {
    const copy = getHydrationCardCopy({
      totalPlants: 0,
      dueToday: 0,
      overdue: 0,
      nextCycleHours: null,
    });

    expect(copy.statusCopy).toContain("Add your first plant");
    expect(copy.cycleCopy).toBe("");
  });

  it("shows cared-for copy when plants exist and none are due", () => {
    const copy = getHydrationCardCopy({
      totalPlants: 3,
      dueToday: 0,
      overdue: 0,
      nextCycleHours: null,
    });

    expect(copy.statusCopy).toBe("Your plants are cared for today.");
    expect(copy.cycleCopy).toBe("");
  });

  it("shows due-soon status and next-cycle-hours meta when care is upcoming", () => {
    const copy = getHydrationCardCopy({
      totalPlants: 2,
      dueToday: 2,
      overdue: 0,
      nextCycleHours: 5,
    });

    expect(copy.statusCopy).toBe(
      "Two specimens are due for care within the next day.",
    );
    expect(copy.cycleCopy).toBe("Next cycle in 5 hours.");
  });
});

describe("library empty contexts", () => {
  it("exposes distinct search and filter empty copy", () => {
    const search = getEmptyStateForContext({ context: "library.search" });
    const filter = getEmptyStateForContext({ context: "library.filter" });
    const empty = getEmptyStateForContext({ context: "library.noPlants" });

    expect(search.title).toBe("No matching plants");
    expect(filter.title).toBe("No plants in this view");
    expect(empty.title).toBe("Your conservatory is waiting");
  });
});

describe("graveyard empty copy", () => {
  it("uses calm memorial language without upsell", () => {
    const copy = getEmptyStateForContext({ context: "graveyard.none" });
    expect(copy.title).toBe("No memorials yet");
    expect(copy.body).toContain("preserve its story");
    expect(copy.tone).toBe("neutral");
  });
});

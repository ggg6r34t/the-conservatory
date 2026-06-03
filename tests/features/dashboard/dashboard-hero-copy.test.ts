import { buildDashboardHeroCopy } from "@/features/dashboard/services/dashboardHeroCopy";

describe("dashboardHeroCopy", () => {
  it("returns first-specimen guidance when collection is empty", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 0,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 0,
      activeReminders: 0,
    });

    expect(copy.eyebrow).toBe("YOUR LIVING GALLERY");
    expect(copy.titleLines).toEqual(["Garden is", "starting."]);
    expect(copy.body).toContain("Add your first plant");
    expect(copy.body).not.toMatch(/lush|welcome back|hydrated/i);
  });

  it("uses live counts when care is due", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 5,
      dueToday: 2,
      overdue: 1,
      upcomingCare: 1,
      activeReminders: 2,
    });

    expect(copy.eyebrow).toBe("YOUR LIVING GALLERY");
    expect(copy.titleLines).toEqual(["Care is", "needed."]);
    expect(copy.body).toContain("need attention today");
    expect(copy.body).not.toMatch(/lush|welcome back/i);
  });

  it("flags reminder pause when no active reminders", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 3,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 2,
      activeReminders: 0,
    });

    expect(copy.body).toContain("No reminders are active yet.");
    expect(copy.titleLines).toEqual(["Garden is", "steady."]);
  });

  it("uses settled language when nothing is due", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 24,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 0,
      activeReminders: 3,
    });

    expect(copy.body).toContain("Everything is settled for today.");
  });
});

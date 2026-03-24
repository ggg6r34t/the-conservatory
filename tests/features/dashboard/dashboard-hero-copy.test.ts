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
    expect(copy.body).toContain(
      "Welcome back. Your indoor sanctuary is looking lush today.",
    );
    expect(copy.body).toContain("first specimen");
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
    expect(copy.body).toContain(
      "Welcome back. Your indoor sanctuary is looking lush today.",
    );
    expect(copy.body).toContain(
      "Your conservatory could use a thoughtful round of care today.",
    );
  });

  it("flags reminder pause when no active reminders", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 3,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 2,
      activeReminders: 0,
    });

    expect(copy.body).toContain("Reminder schedules are currently paused.");
  });

  it("uses digits when counts are above twenty", () => {
    const copy = buildDashboardHeroCopy({
      totalPlants: 24,
      dueToday: 0,
      overdue: 0,
      upcomingCare: 24,
      activeReminders: 3,
    });

    expect(copy.eyebrow).toBe("YOUR LIVING GALLERY");
    expect(copy.body).toContain(
      "24 specimens are approaching their next window",
    );
  });
});

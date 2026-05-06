import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";

describe("reminderOptimizationService", () => {
  it("returns no schedule when reminders are paused", () => {
    const result = optimizeReminderTiming({
      plantName: "Marlowe",
      speciesName: "Pothos",
      wateringIntervalDays: 7,
      nextDueAt: null,
      reminderEnabled: false,
      defaultWateringHour: 9,
    });

    expect(result.shouldSchedule).toBe(false);
    expect(result.nextDueAt).toBeNull();
  });

  it("adjusts based on recent care", () => {
    const now = new Date("2026-03-24T10:00:00.000Z");
    const lastWateredAt = "2026-03-24T08:00:00.000Z";
    const result = optimizeReminderTiming({
      plantName: "Marlowe",
      speciesName: "Pothos",
      wateringIntervalDays: 7,
      nextDueAt: "2026-03-25T08:00:00.000Z",
      lastWateredAt,
      reminderEnabled: true,
      defaultWateringHour: 9,
      now,
    });

    expect(result.nextDueAt).toContain("2026-03-31");
    expect(result.explanation).toContain("recent care");
  });

  it("holds briefly after a recent trigger", () => {
    const now = new Date("2026-03-24T10:00:00.000Z");
    const lastTriggeredAt = new Date(
      now.getTime() + 60 * 60 * 1000,
    ).toISOString();
    const result = optimizeReminderTiming({
      plantName: "Marlowe",
      speciesName: "Pothos",
      wateringIntervalDays: 7,
      nextDueAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      lastTriggeredAt,
      reminderEnabled: true,
      defaultWateringHour: 9,
      now,
    });

    expect(result.explanation).toContain("repeated reminders");
  });
});

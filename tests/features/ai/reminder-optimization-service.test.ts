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
    const lastWateredAt = "2026-03-24T08:00:00.000Z";
    const result = optimizeReminderTiming({
      plantName: "Marlowe",
      speciesName: "Pothos",
      wateringIntervalDays: 7,
      nextDueAt: "2026-03-25T08:00:00.000Z",
      lastWateredAt,
      reminderEnabled: true,
      defaultWateringHour: 9,
    });

    expect(result.nextDueAt).toContain("2026-03-31");
    expect(result.explanation).toContain("recent care");
  });

  it("holds briefly after a recent trigger", () => {
    const lastTriggeredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = optimizeReminderTiming({
      plantName: "Marlowe",
      speciesName: "Pothos",
      wateringIntervalDays: 7,
      nextDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      lastTriggeredAt,
      reminderEnabled: true,
      defaultWateringHour: 9,
    });

    expect(result.explanation).toContain("repeated reminders");
  });
});

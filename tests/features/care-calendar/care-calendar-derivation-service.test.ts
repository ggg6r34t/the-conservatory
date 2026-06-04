import {
  deriveCareCalendarEvents,
  resolveEventStatus,
  toLocalDateKey,
  getDefaultCareCalendarDateKey,
  toggleSelectedDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareLog, CareReminder } from "@/types/models";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

function createPlant(overrides?: Partial<PlantListItem>): PlantListItem {
  return {
    id: "plant-1",
    userId: "user-1",
    name: "Monstera",
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    lastWateredAt: "2026-06-01T10:00:00.000Z",
    nextWaterDueAt: "2026-06-08T10:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

function createReminder(overrides?: Partial<CareReminder>): CareReminder {
  return {
    id: "reminder-1",
    userId: "user-1",
    plantId: "plant-1",
    reminderType: "water",
    frequencyDays: 7,
    enabled: 1,
    nextDueAt: "2026-06-08T09:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

describe("care calendar derivation", () => {
  const now = new Date("2026-06-04T12:00:00.000Z");

  it("places water reminder on the correct day", () => {
    const events = deriveCareCalendarEvents({
      plants: [createPlant()],
      reminders: [createReminder()],
      logs: [],
      now,
    });

    expect(events.some((event) => event.careType === "water" && event.dueDate === "2026-06-08")).toBe(
      true,
    );
  });

  it("places feed reminder on the correct day", () => {
    const events = deriveCareCalendarEvents({
      plants: [createPlant()],
      reminders: [
        createReminder({
          id: "reminder-feed",
          reminderType: "feed",
          frequencyDays: 30,
          nextDueAt: "2026-06-20T09:00:00.000Z",
        }),
      ],
      logs: [],
      now,
    });

    expect(events.some((event) => event.careType === "feed" && event.dueDate === "2026-06-20")).toBe(
      true,
    );
  });

  it("marks overdue tasks before today", () => {
    const events = deriveCareCalendarEvents({
      plants: [createPlant()],
      reminders: [
        createReminder({
          nextDueAt: "2026-06-01T09:00:00.000Z",
        }),
      ],
      logs: [],
      now,
    });

    expect(events.some((event) => event.status === "overdue")).toBe(true);
  });

  it("marks completed care when a log exists on the due day", () => {
    const dueDate = "2026-06-08";
    const logs: CareLog[] = [
      {
        id: "log-1",
        userId: "user-1",
        plantId: "plant-1",
        logType: "water",
        loggedAt: `${dueDate}T15:00:00.000Z`,
        createdAt: `${dueDate}T15:00:00.000Z`,
        updatedAt: `${dueDate}T15:00:00.000Z`,
        pending: 0,
      },
    ];

    const events = deriveCareCalendarEvents({
      plants: [createPlant()],
      reminders: [createReminder({ nextDueAt: `${dueDate}T09:00:00.000Z` })],
      logs,
      now,
    });

    expect(
      events.find((event) => event.dueDate === dueDate && event.careType === "water")?.status,
    ).toBe("completed");
  });

  it("generates recurring upcoming water events", () => {
    const events = deriveCareCalendarEvents({
      plants: [createPlant()],
      reminders: [createReminder({ frequencyDays: 7, nextDueAt: "2026-06-08T09:00:00.000Z" })],
      logs: [],
      now,
      horizonDays: 21,
    });

    const waterDates = events
      .filter((event) => event.careType === "water")
      .map((event) => event.dueDate);

    expect(waterDates).toEqual(
      expect.arrayContaining(["2026-06-08", "2026-06-15", "2026-06-22"]),
    );
  });

  it("uses plant interval when no water reminder exists", () => {
    const events = deriveCareCalendarEvents({
      plants: [
        createPlant({
          nextWaterDueAt: "2026-06-10T09:00:00.000Z",
          lastWateredAt: null,
          wateringIntervalDays: 7,
        }),
      ],
      reminders: [],
      logs: [],
      now,
    });

    expect(events.some((event) => event.source === "plant_interval")).toBe(true);
  });

  it("resolves due today status", () => {
    const todayKey = toLocalDateKey(now);
    expect(
      resolveEventStatus({
        dueDateKey: todayKey,
        now,
        completed: false,
      }),
    ).toBe("due_today");
  });

  it("toggles selected date keys", () => {
    expect(toggleSelectedDateKey("2026-06-04", "2026-06-04")).toBeNull();
    expect(toggleSelectedDateKey(null, "2026-06-04")).toBe("2026-06-04");
  });

  it("defaults selection to the current local day", () => {
    const now = new Date("2026-06-04T12:00:00.000Z");
    expect(getDefaultCareCalendarDateKey(now)).toBe("2026-06-04");
  });
});

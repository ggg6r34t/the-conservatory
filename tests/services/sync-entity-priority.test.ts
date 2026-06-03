import { compareSyncQueueItems } from "@/services/database/syncEntityPriority";

describe("sync entity priority", () => {
  it("processes plants before care reminders and photos", () => {
    const items = [
      { entity: "photos", queuedAt: "2026-01-01T00:00:00.000Z" },
      { entity: "care_reminders", queuedAt: "2026-01-02T00:00:00.000Z" },
      { entity: "plants", queuedAt: "2026-01-03T00:00:00.000Z" },
    ];

    expect([...items].sort(compareSyncQueueItems).map((item) => item.entity)).toEqual([
      "plants",
      "care_reminders",
      "photos",
    ]);
  });

  it("keeps fifo order within the same entity", () => {
    const items = [
      { entity: "plants", queuedAt: "2026-01-03T00:00:00.000Z" },
      { entity: "plants", queuedAt: "2026-01-01T00:00:00.000Z" },
    ];

    expect([...items].sort(compareSyncQueueItems).map((item) => item.queuedAt)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
    ]);
  });
});

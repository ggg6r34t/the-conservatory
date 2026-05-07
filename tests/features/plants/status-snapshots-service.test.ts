import {
  buildStatusSnapshot,
  shouldStoreStatusSnapshot,
} from "@/features/plants/services/statusSnapshotsService";

describe("statusSnapshotsService", () => {
  it("builds a canonical status snapshot from a derived plant status", () => {
    const snapshot = buildStatusSnapshot({
      userId: "user-1",
      plantId: "plant-1",
      healthState: "needs_attention",
      reason: "water-log",
      capturedAt: "2026-05-06T10:00:00.000Z",
    });

    expect(snapshot.status).toBe("needs_water");
    expect(snapshot.reason).toBe("water-log");
    expect(snapshot.plantId).toBe("plant-1");
  });

  it("stores only meaningful status transitions", () => {
    expect(
      shouldStoreStatusSnapshot({
        previousStatus: "stable",
        nextStatus: "stable",
        previousCapturedAt: "2026-05-06T09:00:00.000Z",
        nextCapturedAt: "2026-05-06T10:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      shouldStoreStatusSnapshot({
        previousStatus: "stable",
        nextStatus: "needs_water",
        previousCapturedAt: "2026-05-06T09:00:00.000Z",
        nextCapturedAt: "2026-05-06T10:00:00.000Z",
      }),
    ).toBe(true);
  });
});

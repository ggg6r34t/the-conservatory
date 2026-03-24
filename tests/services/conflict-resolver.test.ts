import { resolveConflict } from "@/services/database/conflictResolver";

describe("conflictResolver", () => {
  it("keeps local record when local row is pending", () => {
    const result = resolveConflict({
      entity: "plants",
      entityId: "plant-1",
      strategy: "last-write-wins",
      localUpdatedAt: "2026-03-24T10:00:00.000Z",
      remoteUpdatedAt: "2026-03-24T11:00:00.000Z",
      localPending: true,
    });

    expect(result).toEqual({ winner: "local", reason: "local-pending" });
  });

  it("prefers newer remote row when local is not pending", () => {
    const result = resolveConflict({
      entity: "plants",
      entityId: "plant-1",
      strategy: "last-write-wins",
      localUpdatedAt: "2026-03-24T10:00:00.000Z",
      remoteUpdatedAt: "2026-03-24T10:30:00.000Z",
      localPending: false,
    });

    expect(result).toEqual({ winner: "remote", reason: "remote-newer" });
  });

  it("keeps local row when local timestamp is newer or equal", () => {
    const result = resolveConflict({
      entity: "plants",
      entityId: "plant-1",
      strategy: "last-write-wins",
      localUpdatedAt: "2026-03-24T10:30:00.000Z",
      remoteUpdatedAt: "2026-03-24T10:30:00.000Z",
      localPending: false,
    });

    expect(result).toEqual({ winner: "local", reason: "local-newer-or-equal" });
  });
});

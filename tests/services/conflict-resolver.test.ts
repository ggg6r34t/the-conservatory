import {
  buildConflictTelemetryMeta,
  resolveConflict,
} from "@/services/database/conflictResolver";

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

  it("builds telemetry metadata with conflict class and source", () => {
    const record = {
      entity: "plants",
      entityId: "plant-1",
      strategy: "last-write-wins" as const,
      localUpdatedAt: "2026-03-24T10:00:00.000Z",
      remoteUpdatedAt: "2026-03-24T10:02:00.000Z",
      localPending: false,
    };
    const result = resolveConflict(record);

    const telemetry = buildConflictTelemetryMeta({
      record,
      result,
      source: "remote-hydration",
    });

    expect(telemetry).toEqual({
      conflictClass: "remote-newer",
      clockSkewSuspected: false,
      source: "remote-hydration",
    });
  });

  it("marks telemetry as clock-skew suspected when drift exceeds threshold", () => {
    const record = {
      entity: "plants",
      entityId: "plant-1",
      strategy: "last-write-wins" as const,
      localUpdatedAt: "2026-03-24T10:00:00.000Z",
      remoteUpdatedAt: "2026-03-24T10:15:01.000Z",
      localPending: false,
    };
    const result = resolveConflict(record);

    const telemetry = buildConflictTelemetryMeta({
      record,
      result,
      source: "remote-hydration",
    });

    expect(telemetry.clockSkewSuspected).toBe(true);
    expect(telemetry.conflictClass).toBe("remote-newer");
  });
});

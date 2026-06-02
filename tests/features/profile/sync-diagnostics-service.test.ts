import {
  canRetrySyncRepairItem,
  formatSyncRepairStatus,
} from "@/features/profile/services/syncDiagnosticsService";

describe("syncDiagnosticsService", () => {
  it("formats repair statuses with truthful operator-facing labels", () => {
    expect(formatSyncRepairStatus("failed")).toBe("Retryable failure");
    expect(formatSyncRepairStatus("deleted_before_sync")).toBe(
      "Local record removed before upload",
    );
    expect(formatSyncRepairStatus("skipped")).toBe("Skipped by sync processor");
  });

  it("allows retry only for recoverable queue states", () => {
    expect(canRetrySyncRepairItem("failed")).toBe(true);
    expect(canRetrySyncRepairItem("abandoned")).toBe(true);
    expect(canRetrySyncRepairItem("processing")).toBe(true);
    expect(canRetrySyncRepairItem("deleted_before_sync")).toBe(false);
    expect(canRetrySyncRepairItem("skipped")).toBe(false);
  });
});

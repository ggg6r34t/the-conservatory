import { deriveCloudSyncStatus } from "@/features/profile/services/cloudSyncStatusService";

describe("cloudSyncStatusService", () => {
  const available = {
    state: "available" as const,
    canSync: true,
    title: "Cloud sync available",
    description: "Ready",
  };

  it("treats enabled auto sync as active when the system is healthy", () => {
    const result = deriveCloudSyncStatus({
      autoSyncEnabled: true,
      remoteAvailability: available,
      isOffline: false,
      isSyncRunning: false,
      hasIssues: false,
      hasPending: false,
      lastSuccessfulSyncAt: "2026-03-29T18:00:00.000Z",
    });

    expect(result.statusTitle).toBe("Auto sync is on");
  });

  it("treats disabled auto sync as manual-only even when cloud sync is available", () => {
    const result = deriveCloudSyncStatus({
      autoSyncEnabled: false,
      remoteAvailability: available,
      isOffline: false,
      isSyncRunning: false,
      hasIssues: false,
      hasPending: false,
      lastSuccessfulSyncAt: null,
    });

    expect(result.statusTitle).toBe("Auto sync is off");
    expect(result.statusDetail).toMatch(/manually/i);
  });

  it("surfaces unavailable cloud sync without pretending auto sync is healthy", () => {
    const result = deriveCloudSyncStatus({
      autoSyncEnabled: true,
      remoteAvailability: {
        state: "unavailable",
        canSync: false,
        title: "Cloud sync unavailable",
        description: "Supabase is unreachable.",
      },
      isOffline: false,
      isSyncRunning: false,
      hasIssues: false,
      hasPending: false,
      lastSuccessfulSyncAt: null,
    });

    expect(result.statusTitle).toBe("Cloud sync unavailable");
    expect(result.statusValue).toBe("Unavailable");
  });
});

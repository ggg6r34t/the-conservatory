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
      isPremium: false,
    });

    expect(result.statusTitle).toBe("Auto sync is on");
    expect(result.photoSyncAvailable).toBe(false);
    expect(result.photoSyncDetail).toMatch(/Photos require Premium/i);
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
      isPremium: false,
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
      isPremium: false,
    });

    expect(result.statusTitle).toBe("Cloud sync unavailable");
    expect(result.statusValue).toBe("Unavailable");
  });

  it("surfaces needs attention when abandoned queue items exist", () => {
    const result = deriveCloudSyncStatus({
      autoSyncEnabled: true,
      remoteAvailability: available,
      isOffline: false,
      isSyncRunning: false,
      hasIssues: true,
      hasPending: false,
      lastSuccessfulSyncAt: "2026-03-29T18:00:00.000Z",
      isPremium: false,
    });

    expect(result.statusTitle).toBe("Needs attention");
    expect(result.statusDetail).toMatch(/unrecoverable/i);
  });

  it("states that premium online auto-sync includes photos", () => {
    const result = deriveCloudSyncStatus({
      autoSyncEnabled: true,
      remoteAvailability: available,
      isOffline: false,
      isSyncRunning: false,
      hasIssues: false,
      hasPending: false,
      lastSuccessfulSyncAt: "2026-03-29T18:00:00.000Z",
      isPremium: true,
    });

    expect(result.photoSyncAvailable).toBe(true);
    expect(result.photoSyncDetail).toMatch(/Photos and all data/i);
  });
});

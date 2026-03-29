const mockProbeRemoteBackendAvailability = jest.fn();
const mockRepairLocalPhotoRecords = jest.fn();
const mockSyncPendingChanges = jest.fn();
const mockHydrateRemoteUserData = jest.fn();

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

jest.mock("@/services/supabase/backendReadiness", () => ({
  probeRemoteBackendAvailability: (...args: unknown[]) =>
    mockProbeRemoteBackendAvailability(...args),
}));

jest.mock("@/services/database/photoRepair", () => ({
  repairLocalPhotoRecords: (...args: unknown[]) =>
    mockRepairLocalPhotoRecords(...args),
}));

jest.mock("@/services/database/sync", () => ({
  syncPendingChanges: (...args: unknown[]) => mockSyncPendingChanges(...args),
}));

jest.mock("@/services/database/remoteHydration", () => ({
  hydrateRemoteUserData: (...args: unknown[]) =>
    mockHydrateRemoteUserData(...args),
}));

describe("userDataSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockProbeRemoteBackendAvailability.mockResolvedValue({
      state: "available",
      canSync: true,
      title: "Cloud sync available",
      description: "Ready",
    });
    mockRepairLocalPhotoRecords.mockResolvedValue(undefined);
    mockHydrateRemoteUserData.mockResolvedValue(undefined);
    mockSyncPendingChanges.mockResolvedValue({
      processed: 1,
      successful: 1,
      failed: 0,
      remaining: 0,
    });
  });

  it("coalesces overlapping sync runs through one canonical executor", async () => {
    let release: (() => void) | null = null;
    mockSyncPendingChanges.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              processed: 1,
              successful: 1,
              failed: 0,
              remaining: 0,
            });
        }),
    );

    const { runUserDataSync } = require("@/services/database/userDataSync");

    const first = runUserDataSync({
      userId: "user-1",
      trigger: "manual",
    });
    const second = runUserDataSync({
      userId: "user-1",
      trigger: "auto-queue",
    });

    await flushMicrotasks();
    expect(mockSyncPendingChanges).toHaveBeenCalledTimes(1);

    release?.();
    await Promise.all([first, second]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSyncPendingChanges).toHaveBeenCalledTimes(2);
  });

  it("surfaces backend unavailability truthfully and does not start replay", async () => {
    mockProbeRemoteBackendAvailability.mockResolvedValueOnce({
      state: "unavailable",
      canSync: false,
      title: "Cloud sync unavailable",
      description: "Backend unreachable",
      detail: "Backend unreachable",
    });

    const {
      getUserDataSyncSnapshot,
      runUserDataSync,
    } = require("@/services/database/userDataSync");

    await expect(
      runUserDataSync({
        userId: "user-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Backend unreachable");

    expect(mockSyncPendingChanges).not.toHaveBeenCalled();
    expect(getUserDataSyncSnapshot().lastError).toBe("Backend unreachable");
  });
});

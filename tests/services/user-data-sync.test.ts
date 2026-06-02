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

    if (release) (release as () => void)();
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

  it("treats partial queue failures as a failed sync run", async () => {
    mockSyncPendingChanges.mockResolvedValueOnce({
      processed: 3,
      successful: 2,
      failed: 1,
      remaining: 1,
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
    ).rejects.toThrow("Sync completed with 1 failed item and 1 item remaining.");

    expect(mockHydrateRemoteUserData).not.toHaveBeenCalled();
    expect(getUserDataSyncSnapshot().lastSuccessfulAt).toBeNull();
    expect(getUserDataSyncSnapshot().lastError).toBe(
      "Sync completed with 1 failed item and 1 item remaining.",
    );
  });

  it("continues clean queue batches until no sync work remains", async () => {
    mockSyncPendingChanges
      .mockResolvedValueOnce({
        processed: 25,
        successful: 25,
        failed: 0,
        remaining: 2,
      })
      .mockResolvedValueOnce({
        processed: 2,
        successful: 2,
        failed: 0,
        remaining: 0,
      });

    const { runUserDataSync } = require("@/services/database/userDataSync");

    await expect(
      runUserDataSync({
        userId: "user-1",
        trigger: "manual",
      }),
    ).resolves.toEqual({
      processed: 27,
      successful: 27,
      failed: 0,
      remaining: 0,
      deletedBeforeSync: 0,
      skipped: 0,
      deferred: 0,
      hydrationApplied: true,
    });

    expect(mockSyncPendingChanges).toHaveBeenCalledTimes(2);
    expect(mockHydrateRemoteUserData).toHaveBeenCalledWith("user-1");
  });
});

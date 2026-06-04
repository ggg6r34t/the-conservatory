import { getBackupSyncSuccessMessage } from "@/features/profile/services/backupSyncMessaging";

describe("backupSyncMessaging", () => {
  it("uses local-only wording when cloud sync is unavailable", () => {
    expect(
      getBackupSyncSuccessMessage({
        remoteCanSync: false,
        hasIssues: false,
        hasPending: false,
      }),
    ).toMatch(/local backup summary/i);
  });

  it("does not claim full cloud backup when issues remain", () => {
    expect(
      getBackupSyncSuccessMessage({
        remoteCanSync: true,
        hasIssues: true,
        hasPending: false,
      }),
    ).toMatch(/Backup Repair/i);
  });

  it("explains follow-up queue work without treating sync as a failure", () => {
    expect(
      getBackupSyncSuccessMessage({
        remoteCanSync: true,
        hasIssues: false,
        hasPending: false,
        completedWithFollowups: true,
      }),
    ).toMatch(/waiting on earlier cloud records/i);
  });

  it("reports queued work without claiming every record is uploaded", () => {
    expect(
      getBackupSyncSuccessMessage({
        remoteCanSync: true,
        hasIssues: false,
        hasPending: true,
      }),
    ).toMatch(/still queued/i);
  });
});

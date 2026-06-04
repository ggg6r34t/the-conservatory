import { repairLocalPhotoRecords } from "@/services/database/photoRepair";
import { hydrateRemoteUserData } from "@/services/database/remoteHydration";
import { syncPendingChanges } from "@/services/database/sync";
import { probeRemoteBackendAvailability } from "@/services/supabase/backendReadiness";
import { logger } from "@/utils/logger";

export type UserDataSyncTrigger =
  | "manual"
  | "auto-bootstrap"
  | "auto-foreground"
  | "auto-network"
  | "auto-queue"
  | "auto-settings";

export interface UserDataSyncSnapshot {
  isRunning: boolean;
  activeUserId: string | null;
  activeTrigger: UserDataSyncTrigger | null;
  lastFailedTrigger: UserDataSyncTrigger | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSuccessfulAt: string | null;
  lastError: string | null;
}

export type UserDataSyncOutcome =
  | "success"
  | "completed_with_followups"
  | "failed";

export interface UserDataSyncResult {
  outcome: UserDataSyncOutcome;
  processed: number;
  successful: number;
  failed: number;
  remaining: number;
  blockingRemaining: number;
  deferredRemaining: number;
  deletedBeforeSync: number;
  skipped: number;
  deferred: number;
  hydrationApplied: boolean;
}

type Listener = (snapshot: UserDataSyncSnapshot) => void;

const MAX_SYNC_BATCHES_PER_RUN = 20;

let inFlight: Promise<UserDataSyncResult> | null = null;
let pendingReplay: {
  userId: string;
  trigger: UserDataSyncTrigger;
} | null = null;

let snapshot: UserDataSyncSnapshot = {
  isRunning: false,
  activeUserId: null,
  activeTrigger: null,
  lastFailedTrigger: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastSuccessfulAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function emitSnapshot() {
  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

async function executeUserDataSync(
  userId: string,
  trigger: UserDataSyncTrigger,
): Promise<UserDataSyncResult> {
  const availability = await probeRemoteBackendAvailability();
  if (!availability.canSync) {
    throw new Error(availability.detail ?? availability.description);
  }

  await repairLocalPhotoRecords(userId);
  let report: Omit<UserDataSyncResult, "outcome"> = {
    processed: 0,
    successful: 0,
    failed: 0,
    remaining: 0,
    blockingRemaining: 0,
    deferredRemaining: 0,
    deletedBeforeSync: 0,
    skipped: 0,
    deferred: 0,
    hydrationApplied: false,
  };

  logger.info("sync.run.started", {
    userId,
    trigger,
  });

  for (let batch = 0; batch < MAX_SYNC_BATCHES_PER_RUN; batch += 1) {
    const nextReport = await syncPendingChanges();
    const blockingRemaining =
      nextReport.blockingRemaining ?? nextReport.remaining;
    const deferredRemaining = Math.max(
      0,
      nextReport.remaining - blockingRemaining,
    );

    report = {
      processed: report.processed + nextReport.processed,
      successful: report.successful + nextReport.successful,
      failed: report.failed + nextReport.failed,
      remaining: nextReport.remaining,
      blockingRemaining,
      deferredRemaining,
      deletedBeforeSync:
        report.deletedBeforeSync + (nextReport.deletedBeforeSync ?? 0),
      skipped: report.skipped + (nextReport.skipped ?? 0),
      deferred: report.deferred + (nextReport.deferred ?? 0),
      hydrationApplied: false,
    };

    logger.info("sync.run.batch", {
      userId,
      trigger,
      batch,
      processed: nextReport.processed,
      successful: nextReport.successful,
      failed: nextReport.failed,
      deferred: nextReport.deferred ?? 0,
      blockingRemaining,
      deferredRemaining,
    });

    if (
      nextReport.failed > 0 ||
      blockingRemaining === 0 ||
      nextReport.processed === 0
    ) {
      break;
    }
  }

  if (report.failed > 0) {
    const failedLabel =
      report.failed === 1 ? "1 failed item" : `${report.failed} failed items`;
    const remainingLabel =
      report.blockingRemaining === 1
        ? "1 item remaining"
        : `${report.blockingRemaining} items remaining`;
    throw new Error(
      `Sync completed with ${failedLabel} and ${remainingLabel}.`,
    );
  }

  const completedWithFollowups = report.blockingRemaining > 0;

  try {
    await hydrateRemoteUserData(userId);
    report = { ...report, hydrationApplied: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Remote hydration failed.";
    throw new Error(`Cloud hydration failed after queue replay: ${message}`);
  }
  await repairLocalPhotoRecords(userId);

  const outcome: UserDataSyncOutcome = completedWithFollowups
    ? "completed_with_followups"
    : "success";

  if (completedWithFollowups) {
    logger.info("sync.execution.completed_with_followups", {
      userId,
      trigger,
      processed: report.processed,
      successful: report.successful,
      failed: report.failed,
      remaining: report.remaining,
      blockingRemaining: report.blockingRemaining,
      deferredRemaining: report.deferredRemaining,
      hydrationApplied: report.hydrationApplied,
    });
  } else {
    logger.info("sync.execution.completed", {
      userId,
      trigger,
      processed: report.processed,
      successful: report.successful,
      failed: report.failed,
      remaining: report.remaining,
      blockingRemaining: report.blockingRemaining,
      deferredRemaining: report.deferredRemaining,
      hydrationApplied: report.hydrationApplied,
    });
  }

  return {
    outcome,
    processed: report.processed,
    successful: report.successful,
    failed: report.failed,
    remaining: report.remaining,
    blockingRemaining: report.blockingRemaining,
    deferredRemaining: report.deferredRemaining,
    deletedBeforeSync: report.deletedBeforeSync,
    skipped: report.skipped,
    deferred: report.deferred,
    hydrationApplied: report.hydrationApplied,
  };
}

function startRun(input: {
  userId: string;
  trigger: UserDataSyncTrigger;
}): Promise<UserDataSyncResult> {
  const startedAt = new Date().toISOString();
  snapshot = {
    ...snapshot,
    isRunning: true,
    activeUserId: input.userId,
    activeTrigger: input.trigger,
    lastStartedAt: startedAt,
    lastError: null,
    lastFailedTrigger: null,
  };
  emitSnapshot();

  const run = executeUserDataSync(input.userId, input.trigger)
    .then((result) => {
      const completedAt = new Date().toISOString();
      snapshot = {
        ...snapshot,
        isRunning: false,
        activeUserId: null,
        activeTrigger: null,
        lastCompletedAt: completedAt,
        lastSuccessfulAt: completedAt,
        lastError: null,
        lastFailedTrigger: null,
      };
      emitSnapshot();
      return result;
    })
    .catch((error) => {
      const completedAt = new Date().toISOString();
      const message =
        error instanceof Error ? error.message : "Unknown sync error.";
      snapshot = {
        ...snapshot,
        isRunning: false,
        activeUserId: null,
        activeTrigger: null,
        lastCompletedAt: completedAt,
        lastFailedTrigger: input.trigger,
        lastError: message,
      };
      emitSnapshot();
      logger.warn("sync.execution.failed", {
        userId: input.userId,
        trigger: input.trigger,
        message,
      });
      throw error;
    })
    .finally(() => {
      inFlight = null;

      if (pendingReplay) {
        const replay = pendingReplay;
        pendingReplay = null;
        void runUserDataSync(replay).catch(() => undefined);
      }
    });

  inFlight = run;
  return run;
}

export function getUserDataSyncSnapshot() {
  return snapshot;
}

export function subscribeToUserDataSync(listener: Listener) {
  listeners.add(listener);
  listener(snapshot);

  return () => {
    listeners.delete(listener);
  };
}

export async function runUserDataSync(input: {
  userId: string;
  trigger: UserDataSyncTrigger;
}) {
  if (inFlight) {
    if (input.trigger !== "manual") {
      pendingReplay = input;
    }
    return inFlight;
  }

  return startRun(input);
}

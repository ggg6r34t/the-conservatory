import { hydrateRemoteUserData } from "@/services/database/remoteHydration";
import { repairLocalPhotoRecords } from "@/services/database/photoRepair";
import { syncPendingChanges } from "@/services/database/sync";
import { probeRemoteBackendAvailability } from "@/services/supabase/backendReadiness";
import { logger } from "@/utils/logger";

export type UserDataSyncTrigger =
  | "manual"
  | "auto-bootstrap"
  | "auto-foreground"
  | "auto-network"
  | "auto-queue";

export interface UserDataSyncSnapshot {
  isRunning: boolean;
  activeUserId: string | null;
  activeTrigger: UserDataSyncTrigger | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSuccessfulAt: string | null;
  lastError: string | null;
}

export interface UserDataSyncResult {
  processed: number;
  successful: number;
  failed: number;
  remaining: number;
}

type Listener = (snapshot: UserDataSyncSnapshot) => void;

let inFlight: Promise<UserDataSyncResult> | null = null;
let pendingReplay:
  | {
      userId: string;
      trigger: UserDataSyncTrigger;
    }
  | null = null;

let snapshot: UserDataSyncSnapshot = {
  isRunning: false,
  activeUserId: null,
  activeTrigger: null,
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
  const report = await syncPendingChanges();
  await hydrateRemoteUserData(userId);
  await repairLocalPhotoRecords(userId);

  logger.info("sync.execution.completed", {
    userId,
    trigger,
    processed: report.processed,
    successful: report.successful,
    failed: report.failed,
    remaining: report.remaining,
  });

  return {
    processed: report.processed,
    successful: report.successful,
    failed: report.failed,
    remaining: report.remaining,
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

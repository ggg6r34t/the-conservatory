import { hydrateRemoteUserData } from "@/services/database/remoteHydration";
import { repairLocalPhotoRecords } from "@/services/database/photoRepair";
import { syncPendingChanges } from "@/services/database/sync";
import { logger } from "@/utils/logger";

const bootstrapInFlight = new Map<string, Promise<void>>();

async function runBootstrapUserDataSync(userId: string) {
  try {
    await repairLocalPhotoRecords(userId);
  } catch (error) {
    logger.warn("sync.bootstrap.photo_repair_failed", {
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    await syncPendingChanges();
  } catch (error) {
    logger.warn("sync.bootstrap.pending_push_failed", {
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  await hydrateRemoteUserData(userId);

  try {
    await repairLocalPhotoRecords(userId);
  } catch (error) {
    logger.warn("sync.bootstrap.photo_repair_post_hydration_failed", {
      userId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function bootstrapUserDataSync(userId: string) {
  const existingRun = bootstrapInFlight.get(userId);
  if (existingRun) {
    return existingRun;
  }

  const run = runBootstrapUserDataSync(userId).finally(() => {
    if (bootstrapInFlight.get(userId) === run) {
      bootstrapInFlight.delete(userId);
    }
  });

  bootstrapInFlight.set(userId, run);
  return run;
}

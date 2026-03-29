function formatLastSuccessfulSync(value: string | null) {
  if (!value) {
    return "Not yet synced";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently observed";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export interface CloudSyncStatusInput {
  autoSyncEnabled: boolean;
  remoteAvailability: {
    state: string;
    canSync: boolean;
    title: string;
    description: string;
  };
  isOffline: boolean;
  isSyncRunning: boolean;
  hasIssues: boolean;
  hasPending: boolean;
  lastSuccessfulSyncAt: string | null;
}

export interface CloudSyncStatusViewModel {
  statusTitle: string;
  statusDetail: string;
  statusValue: string;
}

export function deriveCloudSyncStatus(
  input: CloudSyncStatusInput,
): CloudSyncStatusViewModel {
  if (input.isOffline) {
    return {
      statusTitle: "Offline mode",
      statusDetail:
        "Local saves remain available on this device. Cloud sync will resume when you're connected again.",
      statusValue: input.autoSyncEnabled ? "Waiting" : "Manual only",
    };
  }

  if (
    input.remoteAvailability.state === "local-only" ||
    input.remoteAvailability.state === "unavailable"
  ) {
    return {
      statusTitle: input.remoteAvailability.title,
      statusDetail: input.remoteAvailability.description,
      statusValue: input.autoSyncEnabled ? "Unavailable" : "Off",
    };
  }

  if (input.isSyncRunning) {
    return {
      statusTitle: "Sync in progress",
      statusDetail:
        "Your latest local changes are being replayed to the cloud and then hydrated back into this device.",
      statusValue: "Running now",
    };
  }

  if (input.hasIssues) {
    return {
      statusTitle: "Needs attention",
      statusDetail:
        "Some sync work is still recoverable, but it needs another clean pass before cloud durability looks healthy again.",
      statusValue: "Retry needed",
    };
  }

  if (!input.autoSyncEnabled) {
    return {
      statusTitle: "Auto sync is off",
      statusDetail:
        "Local changes stay on this device until you choose Sync Now manually.",
      statusValue: formatLastSuccessfulSync(input.lastSuccessfulSyncAt),
    };
  }

  if (input.hasPending) {
    return {
      statusTitle: "Waiting to sync",
      statusDetail:
        "Recent local changes are queued and will be pushed automatically on the next safe sync opportunity.",
      statusValue: "Queued locally",
    };
  }

  if (input.lastSuccessfulSyncAt) {
    return {
      statusTitle: "Auto sync is on",
      statusDetail:
        "Cloud backup is enabled and the latest observed sync completed successfully.",
      statusValue: formatLastSuccessfulSync(input.lastSuccessfulSyncAt),
    };
  }

  return {
    statusTitle: "Ready for cloud sync",
    statusDetail:
      "Auto sync is enabled and this device is ready to send future local changes to the cloud.",
    statusValue: "Standing by",
  };
}

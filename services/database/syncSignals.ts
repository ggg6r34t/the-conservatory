type SyncQueueListener = () => void;

const listeners = new Set<SyncQueueListener>();

export function subscribeToSyncQueueChanges(listener: SyncQueueListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifySyncQueueChanged() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors so queue writes stay safe.
    }
  });
}

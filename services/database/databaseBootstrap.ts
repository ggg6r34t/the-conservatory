export type DatabaseBootstrapState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "failed"; error: string };

let bootstrapState: DatabaseBootstrapState = { status: "idle" };
const listeners = new Set<(state: DatabaseBootstrapState) => void>();

function emitState() {
  listeners.forEach((listener) => listener(bootstrapState));
}

export function getDatabaseBootstrapState() {
  return bootstrapState;
}

export function subscribeToDatabaseBootstrapState(
  listener: (state: DatabaseBootstrapState) => void,
) {
  listeners.add(listener);
  listener(bootstrapState);
  return () => {
    listeners.delete(listener);
  };
}

export function markDatabaseBootstrapLoading() {
  bootstrapState = { status: "loading" };
  emitState();
}

export function markDatabaseBootstrapReady() {
  bootstrapState = { status: "ready" };
  emitState();
}

export function markDatabaseBootstrapFailed(error: unknown) {
  bootstrapState = {
    status: "failed",
    error:
      error instanceof Error
        ? error.message
        : "The local conservatory database could not be opened.",
  };
  emitState();
}

export async function retryDatabaseBootstrap(
  initialize: () => Promise<void>,
) {
  markDatabaseBootstrapLoading();
  try {
    await initialize();
    markDatabaseBootstrapReady();
  } catch (error) {
    markDatabaseBootstrapFailed(error);
    throw error;
  }
}

import type { AlertDialogResult, QueuedAlertDialog } from "@/components/feedback/AlertDialog/alert.types";

export function enqueueAlert(
  queue: QueuedAlertDialog[],
  alert: QueuedAlertDialog,
) {
  return [...queue, alert];
}

export function dismissAlert(
  queue: QueuedAlertDialog[],
  id: string | undefined,
): QueuedAlertDialog[] {
  if (!queue.length) {
    return queue;
  }

  if (!id) {
    return queue.slice(1);
  }

  return queue.filter((item) => item.id !== id);
}

export function resolveAllAlerts(
  queue: QueuedAlertDialog[],
  result: AlertDialogResult,
) {
  for (const item of queue) {
    item.resolve(result);
  }
}

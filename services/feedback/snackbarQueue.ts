import type { QueuedSnackbar } from "@/components/feedback/Snackbar/snackbar.types";

export function enqueueSnackbar(
  queue: QueuedSnackbar[],
  snackbar: QueuedSnackbar,
) {
  return [...queue, snackbar];
}

export function dismissSnackbar(queue: QueuedSnackbar[], id?: string) {
  if (!queue.length) {
    return queue;
  }

  if (!id) {
    return queue.slice(1);
  }

  return queue.filter((item) => item.id !== id);
}

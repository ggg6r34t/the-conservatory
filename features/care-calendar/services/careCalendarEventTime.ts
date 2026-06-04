export function formatCareCalendarDueTime(dueAt?: string) {
  if (!dueAt) {
    return null;
  }

  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

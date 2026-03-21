export function formatEditorialDate(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDueLabel(value: string | null | undefined) {
  if (!value) {
    return "TBD";
  }

  const target = new Date(value).getTime();
  const now = Date.now();
  const deltaDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

  if (deltaDays <= 0) {
    return "Today";
  }

  if (deltaDays === 1) {
    return "Tomorrow";
  }

  return `${deltaDays} days`;
}

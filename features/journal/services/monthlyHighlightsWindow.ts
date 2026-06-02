const HIGHLIGHTS_LOOKBACK_MONTHS = 18;

export function getMonthlyHighlightsSinceIso(now = new Date()) {
  const since = new Date(now);
  since.setMonth(since.getMonth() - HIGHLIGHTS_LOOKBACK_MONTHS);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  return since.toISOString();
}

export function isWithinMonthlyHighlightsWindow(
  isoTimestamp: string,
  sinceIso: string,
) {
  return isoTimestamp >= sinceIso;
}

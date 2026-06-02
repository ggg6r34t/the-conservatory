import { FREE_CARE_LOG_HISTORY_DAYS } from "@/features/billing/constants";

export function getFreeCareLogHistorySince(now = new Date()) {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - FREE_CARE_LOG_HISTORY_DAYS);
  return since.toISOString();
}

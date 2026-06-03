/** Lower values are processed first so parent rows sync before FK dependents. */
export const SYNC_ENTITY_PRIORITY: Record<string, number> = {
  user_preferences: 0,
  plants: 10,
  care_logs: 20,
  care_reminders: 25,
  care_log_tags: 30,
  plant_status_snapshots: 35,
  specimen_tags: 40,
  photos: 50,
  graveyard_plants: 55,
  archive_curation_overrides: 60,
  feature_usage: 70,
};

const DEFAULT_SYNC_ENTITY_PRIORITY = 100;

export function compareSyncQueueItems(
  left: { entity: string; queuedAt: string },
  right: { entity: string; queuedAt: string },
) {
  const leftPriority =
    SYNC_ENTITY_PRIORITY[left.entity] ?? DEFAULT_SYNC_ENTITY_PRIORITY;
  const rightPriority =
    SYNC_ENTITY_PRIORITY[right.entity] ?? DEFAULT_SYNC_ENTITY_PRIORITY;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.queuedAt.localeCompare(right.queuedAt);
}

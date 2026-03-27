import type { CareLog, CareReminder } from "@/types/models";

import type { PlantListItem } from "../api/plantsClient";
import { derivePlantStatus, type PlantStatus } from "./plantStatusService";

export interface HighlightedPlantSelectionItem {
  plant: PlantListItem;
  status: PlantStatus;
}

export interface PlantHighlightSelection {
  featuredPlant: HighlightedPlantSelectionItem | null;
  secondaryPlants: HighlightedPlantSelectionItem[];
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareDuePriority(
  left: HighlightedPlantSelectionItem,
  right: HighlightedPlantSelectionItem,
) {
  const leftDays = left.status.daysUntilDue ?? Number.POSITIVE_INFINITY;
  const rightDays = right.status.daysUntilDue ?? Number.POSITIVE_INFINITY;

  if (leftDays !== rightDays) {
    return leftDays - rightDays;
  }

  const leftDue =
    toTimestamp(left.status.effectiveNextWateringDate) ??
    Number.POSITIVE_INFINITY;
  const rightDue =
    toTimestamp(right.status.effectiveNextWateringDate) ??
    Number.POSITIVE_INFINITY;

  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const recentActivityDiff =
    (toTimestamp(right.status.latestActivityAt) ?? 0) -
    (toTimestamp(left.status.latestActivityAt) ?? 0);

  if (recentActivityDiff !== 0) {
    return recentActivityDiff;
  }

  return left.plant.id.localeCompare(right.plant.id);
}

function compareRecentActivity(
  left: HighlightedPlantSelectionItem,
  right: HighlightedPlantSelectionItem,
) {
  const activityDiff =
    (toTimestamp(right.status.latestActivityAt) ?? 0) -
    (toTimestamp(left.status.latestActivityAt) ?? 0);

  if (activityDiff !== 0) {
    return activityDiff;
  }

  return left.plant.id.localeCompare(right.plant.id);
}

function compareThriving(
  left: HighlightedPlantSelectionItem,
  right: HighlightedPlantSelectionItem,
) {
  const leftWatered = toTimestamp(left.status.lastWateredAt) ?? 0;
  const rightWatered = toTimestamp(right.status.lastWateredAt) ?? 0;

  if (leftWatered !== rightWatered) {
    return rightWatered - leftWatered;
  }

  const leftDue = left.status.daysUntilDue ?? Number.NEGATIVE_INFINITY;
  const rightDue = right.status.daysUntilDue ?? Number.NEGATIVE_INFINITY;

  if (leftDue !== rightDue) {
    return rightDue - leftDue;
  }

  return compareRecentActivity(left, right);
}

export function selectPlantHighlights(input: {
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
  now?: Date;
}): PlantHighlightSelection {
  const remindersByPlantId = new Map<string, CareReminder[]>();
  for (const reminder of input.reminders) {
    const existing = remindersByPlantId.get(reminder.plantId) ?? [];
    existing.push(reminder);
    remindersByPlantId.set(reminder.plantId, existing);
  }

  const logsByPlantId = new Map<string, CareLog[]>();
  for (const log of input.logs) {
    const existing = logsByPlantId.get(log.plantId) ?? [];
    existing.push(log);
    logsByPlantId.set(log.plantId, existing);
  }

  const candidates = input.plants
    .filter((plant) => plant.status === "active")
    .map((plant) => ({
      plant,
      status: derivePlantStatus({
        plant,
        reminders: remindersByPlantId.get(plant.id) ?? [],
        logs: logsByPlantId.get(plant.id) ?? [],
        now: input.now,
      }),
    }));

  const featuredPlant =
    [...candidates].filter((item) => item.status.isOverdue).sort(compareDuePriority)[0] ??
    [...candidates].filter((item) => item.status.isDue).sort(compareDuePriority)[0] ??
    [...candidates]
      .filter((item) => item.status.healthState === "thriving")
      .sort(compareThriving)[0] ??
    [...candidates].sort(compareRecentActivity)[0] ??
    null;

  const secondaryPlants = [...candidates]
    .filter(
      (item) =>
        item.plant.id !== featuredPlant?.plant.id &&
        item.status.effectiveNextWateringDate != null,
    )
    .sort(compareDuePriority)
    .slice(0, 2);

  return {
    featuredPlant,
    secondaryPlants,
  };
}

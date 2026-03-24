import { requestDashboardInsight } from "@/features/ai/api/aiClient";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { selectDeterministicVariant } from "@/features/ai/services/editorialVoiceService";
import type { DashboardInsight } from "@/features/ai/types/ai";
import { buildDayKey, withInsightSource } from "@/features/ai/utils/aiMappers";
import { parseDashboardInsightResponse } from "@/features/ai/utils/aiValidators";
import type { CareReminder, Plant } from "@/types/models";

const DAY_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

export function buildDashboardStateSignature(input: {
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
}) {
  const plantSignature = [...input.plants]
    .map((plant) =>
      [
        plant.id,
        plant.nextWaterDueAt ?? "none",
        plant.lastWateredAt ?? "none",
        plant.updatedAt,
      ].join(":"),
    )
    .sort()
    .join("|");
  const reminderSignature = [...input.reminders]
    .map((reminder) =>
      [
        reminder.id,
        reminder.plantId,
        reminder.enabled,
        reminder.nextDueAt ?? "none",
        reminder.updatedAt,
      ].join(":"),
    )
    .sort()
    .join("|");

  return [plantSignature, reminderSignature, input.currentStreakDays].join("::");
}

function buildDashboardCacheKey(
  userId: string,
  dayKey: string,
  signature: string,
) {
  return `ai:dashboard:${userId}:${dayKey}:${signature}`;
}

type RankedPlant = Plant & { overdue: boolean; dueSoon: boolean };

function rankPlants(plants: Plant[]): RankedPlant[] {
  return [...plants]
    .map((plant) => {
      const dueTime = plant.nextWaterDueAt
        ? new Date(plant.nextWaterDueAt).getTime()
        : Number.POSITIVE_INFINITY;
      return {
        ...plant,
        overdue: dueTime <= Date.now(),
        dueSoon: dueTime <= Date.now() + 24 * 60 * 60 * 1000,
      };
    })
    .sort((left, right) => {
      const leftDue = left.nextWaterDueAt
        ? new Date(left.nextWaterDueAt).getTime()
        : Number.POSITIVE_INFINITY;
      const rightDue = right.nextWaterDueAt
        ? new Date(right.nextWaterDueAt).getTime()
        : Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    });
}

export function buildLocalInsight(input: {
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
}): Omit<DashboardInsight, "source"> {
  const ranked = rankPlants(input.plants);
  const overdue = ranked.filter((plant) => plant.overdue);
  const dueSoon = ranked.filter((plant) => !plant.overdue && plant.dueSoon);
  const activeReminderCount = input.reminders.filter((reminder) => reminder.enabled)
    .length;

  if (overdue.length > 0) {
    const plant = overdue[0];
    return {
      title: "Today in your conservatory",
      body: selectDeterministicVariant(
        [
          `${plant.name} is ready for care. A quiet watering pass would steady the collection.`,
          `${plant.name} has drifted to the front of today’s care list. A gentle check-in should be enough.`,
        ],
        `${plant.id}:${plant.nextWaterDueAt ?? "none"}:overdue`,
      ),
      plantId: plant.id,
    };
  }

  if (dueSoon.length > 0) {
    const plant = dueSoon[0];
    return {
      title: "Today in your conservatory",
      body: selectDeterministicVariant(
        [
          `${plant.name} is nearing its next care window. A light check-in would keep the day easy.`,
          `${plant.name} is coming into view for today. Preparing now should keep the rhythm calm.`,
        ],
        `${plant.id}:${plant.nextWaterDueAt ?? "none"}:due-soon`,
      ),
      plantId: plant.id,
    };
  }

  if (input.currentStreakDays > 0) {
    return {
      title: "Today in your conservatory",
      body: selectDeterministicVariant(
        [
          `Your care rhythm has held for ${input.currentStreakDays} day${
            input.currentStreakDays === 1 ? "" : "s"
          }. A small check-in is enough today.`,
          `The collection has kept a steady pace for ${input.currentStreakDays} day${
            input.currentStreakDays === 1 ? "" : "s"
          }. Today can stay light.`,
        ],
        `${input.currentStreakDays}:streak`,
      ),
    };
  }

  return {
    title: "Today in your conservatory",
    body: activeReminderCount > 0
      ? selectDeterministicVariant(
          [
            "The collection feels settled today. It can rest between care moments.",
            "The conservatory is holding its balance today. There is room to let things settle.",
          ],
          `${activeReminderCount}:balanced`,
        )
      : selectDeterministicVariant(
          [
            "The gallery is quiet today. Your plants can settle without interruption.",
            "Nothing urgent is asking for attention today. The collection can stay at ease.",
          ],
          "quiet-day",
        ),
  };
}

export async function getDashboardInsight(input: {
  userId: string;
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
  now?: Date;
}) {
  const dayKey = buildDayKey(input.now);
  const signature = buildDashboardStateSignature(input);
  const cacheKey = buildDashboardCacheKey(input.userId, dayKey, signature);
  const cached = await getCachedValue<DashboardInsight>(cacheKey);
  if (cached) {
    return cached;
  }

  const fallback = buildLocalInsight(input);
  const cloud = await requestDashboardInsight({
    summary: {
      activePlantCount: input.plants.length,
      duePlantCount: input.plants.filter((plant) =>
        plant.nextWaterDueAt
          ? new Date(plant.nextWaterDueAt).getTime() <=
            Date.now() + 24 * 60 * 60 * 1000
          : false,
      ).length,
      overduePlantCount: input.plants.filter((plant) =>
        plant.nextWaterDueAt
          ? new Date(plant.nextWaterDueAt).getTime() <= Date.now()
          : false,
      ).length,
      soonestPlantName: rankPlants(input.plants)[0]?.name,
      currentStreakDays: input.currentStreakDays,
    },
    fallback,
  });
  const parsedCloud = parseDashboardInsightResponse(cloud);
  const insight = parsedCloud
    ? withInsightSource(parsedCloud, "cloud")
    : withInsightSource(fallback, "local");

  await setCachedValue(cacheKey, insight, DAY_CACHE_TTL_MS);
  return insight;
}

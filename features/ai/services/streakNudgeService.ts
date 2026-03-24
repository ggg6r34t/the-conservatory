import { requestStreakNudge } from "@/features/ai/api/aiClient";
import {
  buildDayKey,
  withStreakNudgeSource,
} from "@/features/ai/schemas/aiMappers";
import { parseStreakNudgeResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { selectDeterministicVariant } from "@/features/ai/services/editorialVoiceService";
import type { StreakRecoveryNudge } from "@/features/ai/types/ai";
import type { CareLog, Plant } from "@/types/models";

const STREAK_NUDGE_TTL_MS = 1000 * 60 * 60 * 8;

export function buildStreakNudgeStateSignature(input: {
  plants: Plant[];
  logs: CareLog[];
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
  const latestLog = [...input.logs].sort((left, right) =>
    right.loggedAt.localeCompare(left.loggedAt),
  )[0];

  return [
    plantSignature,
    latestLog?.loggedAt ?? "none",
    input.logs.length,
  ].join("::");
}

function buildStreakNudgeCacheKey(
  userId: string,
  dayKey: string,
  signature: string,
) {
  return `ai:streak-nudge:${userId}:${dayKey}:${signature}`;
}

export function calculateCurrentStreakDays(logs: CareLog[]) {
  const dayKeys = Array.from(
    new Set(logs.map((log) => log.loggedAt.slice(0, 10))),
  ).sort((left, right) => right.localeCompare(left));

  if (!dayKeys.length) {
    return 0;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (dayKeys[0] !== todayKey && dayKeys[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  let expectedDate = new Date(
    (dayKeys[0] === todayKey ? Date.now() : Date.now() - 24 * 60 * 60 * 1000) -
      24 * 60 * 60 * 1000,
  );

  for (let index = 1; index < dayKeys.length; index += 1) {
    const expectedKey = expectedDate.toISOString().slice(0, 10);
    if (dayKeys[index] !== expectedKey) {
      break;
    }

    streak += 1;
    expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

function daysSince(value?: string | null) {
  if (!value) {
    return null;
  }

  return Math.floor(
    (Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function buildLocalStreakNudge(input: {
  currentStreakDays: number;
  plants: Plant[];
  logs: CareLog[];
}): Omit<StreakRecoveryNudge, "source"> | null {
  const overdueCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <= Date.now()
      : false,
  ).length;
  const dueSoonCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <=
        Date.now() + 24 * 60 * 60 * 1000
      : false,
  ).length;
  const daysSinceLastLog = daysSince(
    [...input.logs].sort((left, right) =>
      right.loggedAt.localeCompare(left.loggedAt),
    )[0]?.loggedAt,
  );

  if (daysSinceLastLog === null || daysSinceLastLog <= 0) {
    return null;
  }

  if (overdueCount > 0 && daysSinceLastLog >= 2) {
    return {
      body: selectDeterministicVariant(
        [
          "A brief check-in today could help keep your rhythm steady.",
          "A small care moment today would help the routine feel settled again.",
        ],
        `${overdueCount}:${daysSinceLastLog}:overdue`,
      ),
    };
  }

  if (input.currentStreakDays >= 2 && dueSoonCount > 0) {
    return {
      body: selectDeterministicVariant(
        [
          "One small care moment today may be enough to keep the routine intact.",
          "A light check-in today should be enough to keep the rhythm in place.",
        ],
        `${input.currentStreakDays}:${dueSoonCount}:due-soon`,
      ),
    };
  }

  if (daysSinceLastLog >= 3) {
    return {
      body: selectDeterministicVariant(
        [
          "A gentle review today could help bring the routine back into view.",
          "The collection may benefit from a quiet check-in today.",
        ],
        `${daysSinceLastLog}:quiet-gap`,
      ),
    };
  }

  return null;
}

export async function getStreakRecoveryNudge(input: {
  userId: string;
  plants: Plant[];
  logs: CareLog[];
  now?: Date;
}) {
  const dayKey = buildDayKey(input.now);
  const signature = buildStreakNudgeStateSignature(input);
  const cacheKey = buildStreakNudgeCacheKey(input.userId, dayKey, signature);
  const cached = await getCachedValue<StreakRecoveryNudge>(cacheKey);
  if (cached) {
    return cached;
  }

  const currentStreakDays = calculateCurrentStreakDays(input.logs);
  const fallback = buildLocalStreakNudge({
    currentStreakDays,
    plants: input.plants,
    logs: input.logs,
  });

  if (!fallback) {
    return null;
  }

  const overdueCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <= Date.now()
      : false,
  ).length;
  const dueSoonCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <=
        Date.now() + 24 * 60 * 60 * 1000
      : false,
  ).length;
  const latestLog = [...input.logs].sort((left, right) =>
    right.loggedAt.localeCompare(left.loggedAt),
  )[0];

  const cloud = await requestStreakNudge({
    summary: {
      currentStreakDays,
      overdueCount,
      dueSoonCount,
      daysSinceLastLog: daysSince(latestLog?.loggedAt),
    },
    fallback,
  });

  const parsedCloud = parseStreakNudgeResponse(cloud);
  const result = parsedCloud
    ? withStreakNudgeSource(parsedCloud, "cloud")
    : withStreakNudgeSource(fallback, "local");

  await setCachedValue(cacheKey, result, STREAK_NUDGE_TTL_MS);
  return result;
}

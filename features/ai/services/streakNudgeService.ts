import { requestStreakNudge } from "@/features/ai/api/aiClient";
import { withStreakNudgeSource } from "@/features/ai/schemas/aiMappers";
import { parseStreakNudgeResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { selectDeterministicVariant } from "@/features/ai/services/editorialVoiceService";
import {
  computeCollectionStreak,
  toLocalDayKeyFromDate,
} from "@/features/plants/services/collectionStreakService";
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

export function calculateCurrentStreakDays(
  logs: CareLog[],
  options?: { now?: Date; timeZone?: string },
) {
  const timeZone =
    options?.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";

  return computeCollectionStreak(logs, {
    timeZone,
    now: options?.now,
  }).currentStreak;
}

function daysSince(value?: string | null, now = new Date()) {
  if (!value) {
    return null;
  }

  return Math.floor(
    (now.getTime() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function buildLocalStreakNudge(input: {
  currentStreakDays: number;
  plants: Plant[];
  logs: CareLog[];
  now?: Date;
}): Omit<StreakRecoveryNudge, "source"> | null {
  const now = input.now ?? new Date();
  const overdueCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <= now.getTime()
      : false,
  ).length;
  const dueSoonCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <=
        now.getTime() + 24 * 60 * 60 * 1000
      : false,
  ).length;
  const daysSinceLastLog = daysSince(
    [...input.logs].sort((left, right) =>
      right.loggedAt.localeCompare(left.loggedAt),
    )[0]?.loggedAt,
    now,
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
  timeZone?: string;
}) {
  const now = input.now ?? new Date();
  const timeZone =
    input.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";
  const dayKey = toLocalDayKeyFromDate(now, timeZone);
  const signature = buildStreakNudgeStateSignature(input);
  const cacheKey = buildStreakNudgeCacheKey(input.userId, dayKey, signature);
  const cached = await getCachedValue<StreakRecoveryNudge>(cacheKey);
  if (cached) {
    return cached;
  }

  const currentStreakDays = calculateCurrentStreakDays(input.logs, {
    now,
    timeZone,
  });
  const fallback = buildLocalStreakNudge({
    currentStreakDays,
    plants: input.plants,
    logs: input.logs,
    now,
  });

  if (!fallback) {
    return null;
  }

  const overdueCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <= now.getTime()
      : false,
  ).length;
  const dueSoonCount = input.plants.filter((plant) =>
    plant.nextWaterDueAt
      ? new Date(plant.nextWaterDueAt).getTime() <=
        now.getTime() + 24 * 60 * 60 * 1000
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
      daysSinceLastLog: daysSince(latestLog?.loggedAt, now),
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

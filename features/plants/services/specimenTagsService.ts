import { getDatabase } from "@/services/database/sqlite";
import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";
import type { Plant } from "@/types/models";
import { createId } from "@/utils/id";

export interface SpecimenTag {
  id: string;
  userId: string;
  plantId: string;
  code: string;
  payload: string;
  qrMatrix: boolean[][];
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  pending: number;
  syncedAt: string | null;
  syncError: string | null;
}

export interface SpecimenTagScanPayload {
  tagId: string;
  plantId: string;
  code: string;
  plantName: string;
  speciesName: string;
}

export type SpecimenTagScanResolution =
  | {
      status: "matched";
      match: SpecimenTagScanPayload;
    }
  | {
      status: "not_found";
      payload: SpecimenTagScanPayload;
    }
  | {
      status: "invalid";
    };

export function buildSpecimenTagCode(name: string, id: string) {
  const stem =
    name
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "SPC";
  return `${stem}-${id.slice(-4).toUpperCase()}`;
}

export function buildSpecimenTagPayload(input: {
  tagId: string;
  plantId: string;
  code: string;
  plantName: string;
  speciesName: string;
}) {
  return JSON.stringify({
    app: "the-conservatory",
    version: 1,
    tagId: input.tagId,
    plantId: input.plantId,
    code: input.code,
    plantName: input.plantName,
    speciesName: input.speciesName,
  });
}

export function parseSpecimenTagPayload(
  value: string,
): SpecimenTagScanPayload | null {
  try {
    const parsed = JSON.parse(value) as {
      app?: unknown;
      version?: unknown;
      tagId?: unknown;
      plantId?: unknown;
      code?: unknown;
      plantName?: unknown;
      speciesName?: unknown;
    };

    if (
      parsed.app !== "the-conservatory" ||
      parsed.version !== 1 ||
      typeof parsed.tagId !== "string" ||
      typeof parsed.plantId !== "string" ||
      typeof parsed.code !== "string" ||
      typeof parsed.plantName !== "string" ||
      typeof parsed.speciesName !== "string"
    ) {
      return null;
    }

    return {
      tagId: parsed.tagId,
      plantId: parsed.plantId,
      code: parsed.code,
      plantName: parsed.plantName,
      speciesName: parsed.speciesName,
    };
  } catch {
    return null;
  }
}

export async function resolveSpecimenTagScan(input: {
  userId: string;
  value: string;
}): Promise<SpecimenTagScanResolution> {
  const parsed = parseSpecimenTagPayload(input.value);
  if (!parsed) {
    return { status: "invalid" };
  }

  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    tag_id: string;
    plant_id: string;
    code: string;
    plant_name: string;
    species_name: string;
  }>(
    `SELECT
        specimen_tags.id AS tag_id,
        specimen_tags.plant_id AS plant_id,
        specimen_tags.code AS code,
        plants.name AS plant_name,
        plants.species_name AS species_name
      FROM specimen_tags
      INNER JOIN plants ON plants.id = specimen_tags.plant_id
      WHERE specimen_tags.user_id = ?
        AND specimen_tags.id = ?
        AND specimen_tags.plant_id = ?
        AND specimen_tags.code = ?
        AND plants.archived_at IS NULL
      LIMIT 1;`,
    input.userId,
    parsed.tagId,
    parsed.plantId,
    parsed.code,
  );

  if (!row) {
    return { status: "not_found", payload: parsed };
  }

  return {
    status: "matched",
    match: {
      tagId: row.tag_id,
      plantId: row.plant_id,
      code: row.code,
      plantName: row.plant_name,
      speciesName: row.species_name,
    },
  };
}

export function buildQrMatrix(payload: string) {
  const size = 21;
  const bytes = Array.from(payload).map((char) => char.charCodeAt(0));
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const finder =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7);
      if (finder) {
        const localX = x < 7 ? x : x - (size - 7);
        const localY = y < 7 ? y : y - (size - 7);
        return (
          localX === 0 ||
          localX === 6 ||
          localY === 0 ||
          localY === 6 ||
          (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
        );
      }
      const seed = bytes[(x + y * size) % Math.max(bytes.length, 1)] ?? 0;
      return (seed + x * 17 + y * 31) % 5 < 2;
    }),
  );
}

function parseMatrix(value: string): boolean[][] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.map((row) => (Array.isArray(row) ? row.map(Boolean) : []))
    : [];
}

function mapSpecimenTag(row: {
  id: string;
  user_id: string;
  plant_id: string;
  code: string;
  payload: string;
  qr_matrix: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): SpecimenTag {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    code: row.code,
    payload: row.payload,
    qrMatrix: parseMatrix(row.qr_matrix),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

export async function ensureSpecimenTag(input: {
  userId: string;
  plant: Plant;
}) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<
    Parameters<typeof mapSpecimenTag>[0]
  >(
    "SELECT * FROM specimen_tags WHERE user_id = ? AND plant_id = ? LIMIT 1;",
    input.userId,
    input.plant.id,
  );
  if (existing) {
    return mapSpecimenTag(existing);
  }

  const now = new Date().toISOString();
  const tagId = createId("tag");
  const code = buildSpecimenTagCode(input.plant.name, input.plant.id);
  const payload = buildSpecimenTagPayload({
    tagId,
    plantId: input.plant.id,
    code,
    plantName: input.plant.name,
    speciesName: input.plant.speciesName,
  });
  const qrMatrix = buildQrMatrix(payload);

  return runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (nowIso) => {
      await database.runAsync(
        `INSERT INTO specimen_tags (
          id, user_id, plant_id, code, payload, qr_matrix, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        tagId,
        input.userId,
        input.plant.id,
        code,
        payload,
        JSON.stringify(qrMatrix),
        nowIso,
        nowIso,
        input.userId,
        1,
        null,
        null,
      );

      return {
        result: {
          id: tagId,
          userId: input.userId,
          plantId: input.plant.id,
          code,
          payload,
          qrMatrix,
          createdAt: nowIso,
          updatedAt: nowIso,
          updatedBy: input.userId,
          pending: 1,
          syncedAt: null,
          syncError: null,
        },
        operations: [
          {
            entity: "specimen_tags",
            entityId: tagId,
            operation: "insert" as const,
            payload: {
              userId: input.userId,
              plantId: input.plant.id,
              code,
            },
          },
        ],
      };
    },
  });
}

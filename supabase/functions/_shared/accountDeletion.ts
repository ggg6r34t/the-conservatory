import type { EdgeContext } from "./edge.ts";

const PHOTOS_BUCKET = "photos";
const LIST_LIMIT = 100;

type StorageListEntry = {
  name: string;
  id: string | null;
};

async function listFolder(
  client: EdgeContext["supabaseAdmin"],
  prefix: string,
): Promise<StorageListEntry[]> {
  const { data, error } = await client.storage
    .from(PHOTOS_BUCKET)
    .list(prefix, {
      limit: LIST_LIMIT,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    throw new Error(`Storage listing failed: ${error.message}`);
  }

  return (data ?? []) as StorageListEntry[];
}

export async function purgeUserStorageObjects(
  client: EdgeContext["supabaseAdmin"],
  userId: string,
) {
  const rootPrefix = userId;
  const foldersToVisit = [rootPrefix];
  const filesToRemove: string[] = [];

  while (foldersToVisit.length > 0) {
    const prefix = foldersToVisit.shift()!;
    const entries = await listFolder(client, prefix);

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        foldersToVisit.push(path);
        continue;
      }
      filesToRemove.push(path);
    }
  }

  if (filesToRemove.length === 0) {
    return { removed: 0 };
  }

  const chunkSize = 100;
  let removed = 0;
  for (let index = 0; index < filesToRemove.length; index += chunkSize) {
    const chunk = filesToRemove.slice(index, index + chunkSize);
    const { error } = await client.storage.from(PHOTOS_BUCKET).remove(chunk);
    if (error) {
      throw new Error(`Storage deletion failed: ${error.message}`);
    }
    removed += chunk.length;
  }

  return { removed };
}

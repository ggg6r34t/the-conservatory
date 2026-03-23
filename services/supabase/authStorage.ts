import * as SecureStore from "expo-secure-store";

const SUPABASE_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = "__chunk_count";

function getChunkCountKey(key: string) {
  return `${key}${CHUNK_COUNT_SUFFIX}`;
}

function getChunkKey(key: string, index: number) {
  return `${key}__chunk_${index}`;
}

async function clearChunkedValue(key: string) {
  const countRaw = await SecureStore.getItemAsync(
    getChunkCountKey(key),
    SUPABASE_STORAGE_OPTIONS,
  );
  const count = Number.parseInt(countRaw ?? "0", 10);

  if (Number.isFinite(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(
          getChunkKey(key, index),
          SUPABASE_STORAGE_OPTIONS,
        ),
      ),
    );
  }

  await SecureStore.deleteItemAsync(getChunkCountKey(key), SUPABASE_STORAGE_OPTIONS);
}

export const supabaseAuthStorage = {
  getItem: async (key: string) => {
    const chunkCountRaw = await SecureStore.getItemAsync(
      getChunkCountKey(key),
      SUPABASE_STORAGE_OPTIONS,
    );
    const chunkCount = Number.parseInt(chunkCountRaw ?? "0", 10);

    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      const chunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, index) =>
          SecureStore.getItemAsync(getChunkKey(key, index), SUPABASE_STORAGE_OPTIONS),
        ),
      );

      if (chunks.some((chunk) => typeof chunk !== "string")) {
        await clearChunkedValue(key);
        return null;
      }

      return chunks.join("");
    }

    return SecureStore.getItemAsync(key, SUPABASE_STORAGE_OPTIONS);
  },
  setItem: async (key: string, value: string) => {
    if (value.length <= CHUNK_SIZE) {
      await clearChunkedValue(key);
      await SecureStore.setItemAsync(key, value, SUPABASE_STORAGE_OPTIONS);
      return;
    }

    await SecureStore.deleteItemAsync(key, SUPABASE_STORAGE_OPTIONS);

    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(
          getChunkKey(key, index),
          chunk,
          SUPABASE_STORAGE_OPTIONS,
        ),
      ),
    );
    await SecureStore.setItemAsync(
      getChunkCountKey(key),
      String(chunks.length),
      SUPABASE_STORAGE_OPTIONS,
    );
  },
  removeItem: async (key: string) => {
    await Promise.all([
      SecureStore.deleteItemAsync(key, SUPABASE_STORAGE_OPTIONS),
      clearChunkedValue(key),
    ]);
  },
};

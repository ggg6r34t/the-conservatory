import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "memorial-layout-preferences:";

export interface MemorialLayoutPreferences {
  featuredMemorialId: string | null;
  pinnedMemorialIds: string[];
}

const DEFAULT_PREFERENCES: MemorialLayoutPreferences = {
  featuredMemorialId: null,
  pinnedMemorialIds: [],
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export async function readMemorialLayoutPreferences(userId: string) {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MemorialLayoutPreferences>;
    return {
      featuredMemorialId:
        typeof parsed.featuredMemorialId === "string"
          ? parsed.featuredMemorialId
          : null,
      pinnedMemorialIds: Array.isArray(parsed.pinnedMemorialIds)
        ? parsed.pinnedMemorialIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function writeMemorialLayoutPreferences(
  userId: string,
  preferences: MemorialLayoutPreferences,
) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(preferences));
}

export async function setFeaturedMemorialPreference(
  userId: string,
  memorialId: string | null,
) {
  const current = await readMemorialLayoutPreferences(userId);
  const pinnedMemorialIds = memorialId
    ? Array.from(new Set([memorialId, ...current.pinnedMemorialIds]))
    : current.pinnedMemorialIds;

  await writeMemorialLayoutPreferences(userId, {
    featuredMemorialId: memorialId,
    pinnedMemorialIds,
  });
}

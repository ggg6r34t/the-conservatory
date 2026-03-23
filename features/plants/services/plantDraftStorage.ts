import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PlantFormInput } from "@/features/plants/schemas/plantValidation";
import { logger } from "@/utils/logger";

const PLANT_DRAFT_KEY = "plant-form-draft";

export async function getPlantDraft(): Promise<Partial<PlantFormInput> | null> {
  try {
    const saved = await AsyncStorage.getItem(PLANT_DRAFT_KEY);
    return saved ? (JSON.parse(saved) as Partial<PlantFormInput>) : null;
  } catch (error) {
    logger.warn("plants.draft.read_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    await AsyncStorage.removeItem(PLANT_DRAFT_KEY).catch(() => undefined);
    return null;
  }
}

export async function setPlantDraft(values: Partial<PlantFormInput>): Promise<void> {
  try {
    await AsyncStorage.setItem(PLANT_DRAFT_KEY, JSON.stringify(values));
  } catch (error) {
    logger.warn("plants.draft.write_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function clearPlantDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLANT_DRAFT_KEY);
  } catch (error) {
    logger.warn("plants.draft.clear_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

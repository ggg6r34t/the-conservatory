import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";
import { useSettingsStore } from "@/features/settings/stores/useSettingsStore";

export function useRootStore() {
  return {
    auth: useAuthStore(),
    plants: usePlantStore(),
    settings: useSettingsStore(),
  };
}

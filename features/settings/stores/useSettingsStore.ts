import { create } from "zustand";

import type { ThemeId } from "@/features/theme/types";

interface SettingsState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "linen-light",
  setTheme: (theme) => set({ theme }),
}));

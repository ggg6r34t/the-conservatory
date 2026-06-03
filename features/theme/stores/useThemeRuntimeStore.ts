import { create } from "zustand";

import { DEFAULT_THEME_ID } from "@/features/theme/registry";
import type { ThemeId } from "@/features/theme/types";

interface ThemeRuntimeState {
  activeThemeId: ThemeId;
  hydrated: boolean;
  transitionProgress: number;
  setActiveThemeId: (themeId: ThemeId) => void;
  setHydrated: (hydrated: boolean) => void;
  setTransitionProgress: (progress: number) => void;
}

export const useThemeRuntimeStore = create<ThemeRuntimeState>((set) => ({
  activeThemeId: DEFAULT_THEME_ID,
  hydrated: false,
  transitionProgress: 1,
  setActiveThemeId: (activeThemeId) => set({ activeThemeId }),
  setHydrated: (hydrated) => set({ hydrated }),
  setTransitionProgress: (transitionProgress) => set({ transitionProgress }),
}));

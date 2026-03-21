import { create } from "zustand";

interface SettingsState {
  theme: "linen-light";
  setTheme: (theme: "linen-light") => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "linen-light",
  setTheme: (theme) => set({ theme }),
}));

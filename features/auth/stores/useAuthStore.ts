import { create } from "zustand";

import type { AppUser } from "@/types/models";

interface AuthState {
  user: AppUser | null;
  status: "loading" | "authenticated" | "anonymous";
  setUser: (user: AppUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: "authenticated" }),
  clearUser: () => set({ user: null, status: "anonymous" }),
}));

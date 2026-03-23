import { create } from "zustand";

import type { AppUser } from "@/types/models";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "signing_out";

interface AuthState {
  user: AppUser | null;
  status: AuthStatus;
  transitionId: number;
  beginRestore: () => number | null;
  beginSignOut: () => number;
  setUser: (user: AppUser) => void;
  resolveUser: (user: AppUser, transitionId: number) => void;
  clearUser: (transitionId?: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "loading",
  transitionId: 0,
  beginRestore: () => {
    const current = get();
    if (current.status === "loading" && current.transitionId > 0) {
      return null;
    }

    let nextId = 0;
    set((state) => {
      nextId = state.transitionId + 1;
      return { status: "loading", transitionId: nextId };
    });
    return nextId;
  },
  beginSignOut: () => {
    let nextId = 0;
    set((state) => {
      nextId = state.transitionId + 1;
      return { status: "signing_out", transitionId: nextId };
    });
    return nextId;
  },
  setUser: (user) =>
    set((state) => ({
      user,
      status: "authenticated",
      transitionId: state.transitionId + 1,
    })),
  resolveUser: (user, transitionId) =>
    set((state) =>
      state.transitionId === transitionId
        ? { user, status: "authenticated" }
        : state,
    ),
  clearUser: (transitionId) =>
    set((state) => {
      if (transitionId != null && state.transitionId !== transitionId) {
        return state;
      }

      return { user: null, status: "anonymous" };
    }),
}));

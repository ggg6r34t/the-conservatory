import { create } from "zustand";

import type { AppUser } from "@/types/models";
import { setActiveDataOwnerUserId } from "@/services/database/syncDataOwner";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "guest"
  | "anonymous"
  | "signing_out";

interface AuthState {
  user: AppUser | null;
  status: AuthStatus;
  transitionId: number;
  beginRestore: () => number | null;
  beginSignOut: () => number;
  setUser: (user: AppUser) => void;
  setGuestUser: (user: AppUser) => void;
  resolveUser: (user: AppUser, transitionId: number) => void;
  resolveGuestUser: (user: AppUser, transitionId: number) => void;
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
  setUser: (user) => {
    setActiveDataOwnerUserId(user.id);
    set((state) => ({
      user,
      status: "authenticated",
      transitionId: state.transitionId + 1,
    }));
  },
  setGuestUser: (user) => {
    setActiveDataOwnerUserId(user.id);
    set((state) => ({
      user,
      status: "guest",
      transitionId: state.transitionId + 1,
    }));
  },
  resolveUser: (user, transitionId) => {
    setActiveDataOwnerUserId(user.id);
    set((state) =>
      state.transitionId === transitionId
        ? { user, status: "authenticated" }
        : state,
    );
  },
  resolveGuestUser: (user, transitionId) => {
    setActiveDataOwnerUserId(user.id);
    set((state) =>
      state.transitionId === transitionId
        ? { user, status: "guest" }
        : state,
    );
  },
  clearUser: (transitionId) =>
    set((state) => {
      if (transitionId != null && state.transitionId !== transitionId) {
        return state;
      }

      setActiveDataOwnerUserId(null);
      return { user: null, status: "anonymous" };
    }),
}));

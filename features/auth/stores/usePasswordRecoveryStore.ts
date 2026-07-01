import { create } from "zustand";

interface PasswordRecoveryState {
  isActive: boolean;
  linkErrorCode: string | null;
  activate: () => void;
  clear: () => void;
  setLinkError: (code: string | null) => void;
}

export const usePasswordRecoveryStore = create<PasswordRecoveryState>((set) => ({
  isActive: false,
  linkErrorCode: null,
  activate: () => set({ isActive: true, linkErrorCode: null }),
  clear: () => set({ isActive: false, linkErrorCode: null }),
  setLinkError: (code) => set({ linkErrorCode: code }),
}));

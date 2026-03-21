import * as SecureStore from "expo-secure-store";

import type { AppUser } from "@/types/models";

const SESSION_KEY = "the-conservatory.session";

export async function readSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as AppUser;
}

export async function writeSession(user: AppUser) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

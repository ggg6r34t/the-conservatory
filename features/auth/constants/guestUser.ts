import type { AppUser } from "@/types/models";
import { createId } from "@/utils/id";

export const GUEST_USER_ID_PREFIX = "guest-";
export const GUEST_EMAIL_DOMAIN = "local.theconservatory.app";
export const GUEST_DISPLAY_NAME = "Local Curator";
export const PENDING_GUEST_MIGRATION_KEY =
  "the-conservatory.pending-guest-migration";

export function isGuestUserId(userId: string | null | undefined) {
  return Boolean(userId?.startsWith(GUEST_USER_ID_PREFIX));
}

export function isGuestUser(user: AppUser | null | undefined) {
  return Boolean(user?.isGuest || isGuestUserId(user?.id));
}

export function buildGuestEmail(guestUserId: string) {
  const suffix = guestUserId.replace(GUEST_USER_ID_PREFIX, "");
  return `${suffix}@${GUEST_EMAIL_DOMAIN}`;
}

export function createGuestAppUser(existingId?: string): AppUser {
  const now = new Date().toISOString();
  const id = existingId ?? createId(GUEST_USER_ID_PREFIX.replace(/-$/, ""));

  return {
    id,
    email: buildGuestEmail(id),
    displayName: GUEST_DISPLAY_NAME,
    avatarUrl: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    isGuest: true,
  };
}

import { isGuestUserId } from "@/features/auth/constants/guestUser";

let activeDataOwnerUserId: string | null = null;

export function setActiveDataOwnerUserId(userId: string | null) {
  activeDataOwnerUserId = userId;
}

export function getActiveDataOwnerUserId() {
  return activeDataOwnerUserId;
}

export function shouldSkipSyncOutboxForActiveUser() {
  return isGuestUserId(activeDataOwnerUserId);
}

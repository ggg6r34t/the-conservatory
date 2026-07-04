import { usePostAuthGuestMigration } from "@/features/auth/hooks/usePostAuthGuestMigration";

export function GuestMigrationBridge() {
  usePostAuthGuestMigration();
  return null;
}

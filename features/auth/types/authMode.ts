export type AuthMode = "guest" | "authenticated";

export type GuestFeature =
  | "cloud_sync"
  | "cloud_backup"
  | "photo_cloud_backup"
  | "multi_device_restore"
  | "premium_purchase"
  | "premium_restore"
  | "cloud_ai"
  | "account_deletion"
  | "account_recovery"
  | "feature_requests"
  | "cross_device_preferences"
  | "supabase_profile";

export type GuestAccessReason =
  | "requires_account"
  | "local_only"
  | "requires_premium"
  | "requires_sync";

export interface GuestAccessResult {
  canUse: boolean;
  reason?: GuestAccessReason;
}

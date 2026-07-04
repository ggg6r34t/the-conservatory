import type {
  GuestAccessReason,
  GuestAccessResult,
  GuestFeature,
} from "@/features/auth/types/authMode";

const ACCOUNT_REQUIRED_FEATURES = new Set<GuestFeature>([
  "cloud_sync",
  "cloud_backup",
  "photo_cloud_backup",
  "multi_device_restore",
  "premium_purchase",
  "premium_restore",
  "cloud_ai",
  "account_deletion",
  "account_recovery",
  "feature_requests",
  "cross_device_preferences",
  "supabase_profile",
]);

export function canUseFeatureAsGuest(
  feature: GuestFeature,
  options?: { isGuest?: boolean; isPremium?: boolean },
): GuestAccessResult {
  if (!options?.isGuest) {
    return { canUse: true };
  }

  if (ACCOUNT_REQUIRED_FEATURES.has(feature)) {
    return { canUse: false, reason: "requires_account" };
  }

  if (options.isPremium) {
    return { canUse: false, reason: "requires_account" };
  }

  return { canUse: true, reason: "local_only" };
}

/** Cloud AI and other account-backed remote features stay local-only for guests. */
export function resolveGuestCloudAllowed(isGuest: boolean, cloudAllowed: boolean) {
  return !isGuest && cloudAllowed;
}

export function getAccountRequiredCopy(feature: GuestFeature): {
  title: string;
  message: string;
  analyticsKey: string;
} {
  switch (feature) {
    case "cloud_sync":
    case "cloud_backup":
    case "multi_device_restore":
      return {
        title: "Create an account to back up your conservatory",
        message:
          "Your plants are saved on this device. Sign up to protect them with cloud sync.",
        analyticsKey: "guest_account_required_cloud_backup",
      };
    case "photo_cloud_backup":
      return {
        title: "Create an account to back up photos",
        message:
          "Photo backup requires an account so your images stay protected across devices.",
        analyticsKey: "guest_account_required_photo_backup",
      };
    case "cloud_ai":
      return {
        title: "Create an account to use cloud insights",
        message:
          "AI insights require an account so usage can stay private, secure, and recoverable.",
        analyticsKey: "guest_account_required_cloud_ai",
      };
    case "premium_purchase":
    case "premium_restore":
      return {
        title: "Create an account for Premium",
        message:
          "Premium is linked to your account so it can be restored across devices.",
        analyticsKey: "guest_account_required_premium",
      };
    case "feature_requests":
      return {
        title: "Create an account to share feedback",
        message:
          "Feature requests are linked to your account so we can follow up when needed.",
        analyticsKey: "guest_account_required_feature_requests",
      };
    default:
      return {
        title: "Create an account to continue",
        message:
          "This feature requires an account so your conservatory stays protected and recoverable.",
        analyticsKey: "guest_account_required_generic",
      };
  }
}

export function guestAccessReasonLabel(reason?: GuestAccessReason) {
  switch (reason) {
    case "requires_account":
      return "Account required";
    case "local_only":
      return "Stored only on this device";
    case "requires_premium":
      return "Premium required";
    case "requires_sync":
      return "Cloud sync required";
    default:
      return undefined;
  }
}

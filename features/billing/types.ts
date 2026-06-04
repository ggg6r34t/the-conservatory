export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionPeriod = 'monthly' | 'annual' | 'lifetime';

export interface SubscriptionState {
  tier: SubscriptionTier;
  isLoading: boolean;
  isRestoring: boolean;
  expiresAt: string | null;
  period: SubscriptionPeriod | null;
  error: string | null;
  lastVerifiedAt?: string | null;
  subscribedAt?: string | null;
  entitlementUnavailable?: boolean;
}

export interface BillingPackage {
  identifier: string;
  packageType: SubscriptionPeriod | 'unknown';
  priceString: string;
  pricePerMonthString: string;
  productIdentifier: string;
  introductoryPrice: string | null;
}

export interface BillingOffering {
  identifier: string;
  packages: BillingPackage[];
  monthly: BillingPackage | null;
  annual: BillingPackage | null;
  lifetime: BillingPackage | null;
}

export interface PurchaseResult {
  success: boolean;
  tier: SubscriptionTier;
  error?: string;
  userCancelled?: boolean;
}

export interface BillingAdapter {
  initialize(userId: string): Promise<void>;
  getSubscriptionState(): Promise<Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>>;
  getOfferings(): Promise<BillingOffering | null>;
  purchasePackage(packageIdentifier: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
  setSubscriptionStateListener?(
    listener: (
      state: Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>,
    ) => void,
  ): () => void;
  logOut(): Promise<void>;
}

export type GatedFeature =
  | 'plant_create'
  | 'progress_photo_upload'
  | 'ai_health_insight'
  | 'ai_journal_narrative'
  | 'ai_dashboard_editorial'
  | 'ai_archive_curation'
  | 'ai_species_identification'
  | 'smart_reminder_optimization'
  | 'ai_care_schedule'
  | 'specimen_tag_create'
  | 'advanced_library_filters'
  | 'premium_export';

export type FeatureAccessResult =
  | { canUse: true }
  | { canUse: false; reason: 'requires_premium' }
  | { canUse: false; reason: 'quota_exceeded'; used: number; limit: number };

export interface UsageSnapshot {
  totalPlantCount: number;
  progressPhotosForPlant: Record<string, number>;
  aiHealthInsightsThisMonth: Record<string, number>;
  plantIdThisMonth: number;
}

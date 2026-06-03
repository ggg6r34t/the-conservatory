export type EmptyStateTone =
  | "firstRun"
  | "neutral"
  | "filtered"
  | "permission"
  | "premium"
  | "offline"
  | "error"
  | "insufficientData";

export type EmptyStateContent = {
  title: string;
  body: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  icon?: string;
  illustration?: string;
  tone: EmptyStateTone;
  analyticsKey: string;
};

export type EmptyStateContextKey =
  | "dashboard.hero"
  | "dashboard.hydration"
  | "dashboard.gallery"
  | "library.noPlants"
  | "library.search"
  | "library.filter"
  | "journal.noPlants"
  | "journal.noLogs"
  | "journal.period"
  | "reminders.noPlants"
  | "reminders.none"
  | "reminders.notificationsDisabled"
  | "timeline.noPhotos"
  | "timeline.noPlant"
  | "timeline.insufficientComparison"
  | "highlights.noPlants"
  | "highlights.noPhotos"
  | "highlights.none"
  | "highlights.error"
  | "graveyard.none"
  | "archive.premiumLocked"
  | "archive.insufficientData"
  | "archive.noPairs"
  | "archive.noMemorials"
  | "profile.streakZero"
  | "plantActivity.noLogs"
  | "plantDetail.noCareLogs"
  | "plantDetail.noPhotos"
  | "specimenTags.noPlants"
  | "ai.insufficientData"
  | "ai.premiumRequired"
  | "ai.quotaReached"
  | "ai.fallback"
  | "ai.offline"
  | "ai.error"
  | "backup.noHistory"
  | "backup.unavailable"
  | "backup.localOnly"
  | "backup.noRecords"
  | "backup.failed"
  | "sync.abandoned"
  | "sync.repairQueueEmpty"
  | "premium.offeringsUnavailable"
  | "premium.entitlementUnavailable"
  | "premium.alreadySubscribed"
  | "premium.restoreUnavailable"
  | "featureRequests.searchEmpty"
  | "featureRequests.mineEmpty";

export type EmptyStateResolveInput = {
  context: EmptyStateContextKey;
  totalPlants?: number;
  hasPlants?: boolean;
  hasCareLogs?: boolean;
  hasReminders?: boolean;
  hasProgressPhotos?: boolean;
  hasSearchQuery?: boolean;
  hasActiveFilter?: boolean;
  isPremium?: boolean;
  remindersEnabled?: boolean;
  isOffline?: boolean;
  isError?: boolean;
};

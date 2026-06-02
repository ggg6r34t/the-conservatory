export const FEATURE_REQUEST_CATEGORIES = [
  "Plant Care",
  "AI Features",
  "Journal",
  "Timeline",
  "Photos",
  "Reminders",
  "Memorials",
  "Collection Management",
  "Premium Features",
  "Sync & Backup",
  "Performance",
  "Accessibility",
  "Other",
] as const;

export type FeatureRequestCategory = (typeof FEATURE_REQUEST_CATEGORIES)[number];

export const FEATURE_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "planned",
  "in_progress",
  "released",
  "declined",
] as const;

export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export const ROADMAP_STATUSES = ["planned", "in_progress", "released"] as const;

export type RoadmapItemStatus = (typeof ROADMAP_STATUSES)[number];

export const FEATURE_REQUEST_PAGE_SIZE = 20;

export const FEATURE_REQUEST_CACHE_KEY = "product_feedback_cache_v1";

export const FEEDBACK_SCREENSHOT_MAX = 3;

export const FEEDBACK_SCREENSHOT_STORAGE_PREFIX = "feedback-screenshots";

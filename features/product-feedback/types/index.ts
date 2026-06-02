import type {
  FeatureRequestCategory,
  FeatureRequestStatus,
  RoadmapItemStatus,
} from "@/features/product-feedback/constants";

export type FeatureRequest = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: FeatureRequestCategory;
  status: FeatureRequestStatus;
  plantId: string | null;
  contactPreference: "in_app" | "email" | "none";
  screenshotUrls: string[];
  voteCount: number;
  archived: boolean;
  mergedIntoId: string | null;
  releaseVersion: string | null;
  releaseNotes: string | null;
  createdAt: string;
  updatedAt: string;
  hasVoted?: boolean;
};

export type FeatureRequestUpdate = {
  id: string;
  requestId: string;
  updateText: string;
  createdBy: string | null;
  createdAt: string;
};

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapItemStatus;
  releaseVersion: string | null;
  releaseNotes: string | null;
  linkedRequestIds: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type FeatureRequestNotification = {
  id: string;
  userId: string;
  requestId: string | null;
  roadmapItemId: string | null;
  title: string;
  body: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
};

export type SubmitFeatureRequestInput = {
  title: string;
  description: string;
  category: FeatureRequestCategory;
  plantId?: string | null;
  contactPreference?: "in_app" | "email" | "none";
  screenshotUrls?: string[];
};

export type FeatureRequestListSection =
  | "popular"
  | "recent"
  | "shipped"
  | "mine"
  | "search";

export type BetaProgramConsent = {
  userId: string;
  optedIn: boolean;
  earlyAccess: boolean;
  betaReleases: boolean;
  feedbackProgram: boolean;
  consentedAt: string | null;
  updatedAt: string;
};

export type FeatureRequestFeedbackScore = {
  requestId: string;
  userId: string;
  score: -1 | 1;
};

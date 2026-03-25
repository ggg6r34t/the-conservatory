// Types for Supabase Edge Functions
// Only types used by deployed functions are included

export type AiSource = "local" | "cloud";

// --- Dashboard Insight Function ---
export interface DashboardInsight {
  title: string;
  body: string;
  plantId?: string;
  source: AiSource;
}

export interface GenerateDashboardInsightRequest {
  summary: {
    activePlantCount: number;
    duePlantCount: number;
    overduePlantCount: number;
    soonestPlantName?: string;
    currentStreakDays: number;
  };
  fallback: Omit<DashboardInsight, "source">;
}

export interface GenerateDashboardInsightResponse {
  insight: Omit<DashboardInsight, "source"> | null;
}

// --- Curate Archive Gallery Function ---
export interface ArchiveCuratedPair {
  plantId: string;
  plantName: string;
  beforeUri: string;
  afterUri: string;
  caption: string;
  source: AiSource;
}

export interface CurateArchiveGalleryRequest {
  items: {
    plantId: string;
    plantName: string;
    photoUris: string[];
  }[];
}

export interface CurateArchiveGalleryResponse {
  pairs: Omit<ArchiveCuratedPair, "source">[];
}

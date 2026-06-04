export type CareCalendarCareType =
  | "water"
  | "mist"
  | "feed"
  | "repot"
  | "prune"
  | "inspect"
  | "soil_change"
  | "pest_check"
  | "note";

export type CareCalendarEventStatus =
  | "upcoming"
  | "due_today"
  | "overdue"
  | "completed"
  | "skipped";

export type CareCalendarEventSource =
  | "manual_reminder"
  | "plant_interval"
  | "ai_suggested"
  | "care_history"
  | "default_profile";

export type CareCalendarConfidence = "low" | "medium" | "high";

export type CareSuggestionDerivation = "cloud" | "local" | "cached";

export type CareCalendarEvent = {
  id: string;
  plantId: string;
  plantName: string;
  careType: CareCalendarCareType;
  dueDate: string;
  status: CareCalendarEventStatus;
  source: CareCalendarEventSource;
  confidence?: CareCalendarConfidence;
  reason?: string;
  isAiSuggested?: boolean;
  suggestionDerivation?: CareSuggestionDerivation;
  reminderId?: string;
};

export type CareCalendarFilter =
  | "all"
  | "water"
  | "feed"
  | "mist"
  | "repot"
  | "prune"
  | "inspect"
  | "overdue"
  | "ai_suggested";

export type CareScheduleSuggestion = {
  id: string;
  plantId: string;
  plantName: string;
  careType: CareCalendarCareType;
  suggestedDueDate: string;
  frequencyDays: number;
  confidence: CareCalendarConfidence;
  reason: string;
};

export type CareCalendarViewMode = "month" | "agenda";

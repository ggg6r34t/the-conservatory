import { EdgeFunctionError } from "./edge.ts";

type Validator = (value: unknown) => unknown;

const OBSERVATION_TAGS = new Set([
  "new growth",
  "yellowing leaves",
  "dry soil",
  "pest concern",
  "pruning",
  "stable condition",
]);

function fail(message: string): never {
  throw new EdgeFunctionError("validation_error", 400, message);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is required.`);
  }
  if (value.length > maxLength) {
    fail(`${label} is too long.`);
  }
  return value;
}

function optionalString(
  value: unknown,
  label: string,
  maxLength = 500,
): string | undefined {
  if (value == null) {
    return undefined;
  }
  return string(value, label, maxLength);
}

function number(value: unknown, label: string, min = 0, max = 10000): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    fail(`${label} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`);
  }
  return value;
}

function array<T>(
  value: unknown,
  label: string,
  itemValidator: (item: unknown, index: number) => T,
  maxItems = 20,
): T[] {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }
  if (value.length > maxItems) {
    fail(`${label} has too many items.`);
  }
  return value.map(itemValidator);
}

function nullableObject(
  value: unknown,
  label: string,
): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }
  return object(value, label);
}

function validateDashboardRequest(value: unknown) {
  const input = object(value, "request");
  const summary = object(input.summary, "summary");
  const fallback = object(input.fallback, "fallback");
  number(summary.activePlantCount, "activePlantCount");
  number(summary.duePlantCount, "duePlantCount");
  number(summary.overduePlantCount, "overduePlantCount");
  number(summary.currentStreakDays, "currentStreakDays");
  optionalString(summary.soonestPlantName, "soonestPlantName", 120);
  string(fallback.title, "fallback.title", 120);
  string(fallback.body, "fallback.body", 500);
  return input;
}

function validateJournalRequest(value: unknown) {
  const input = object(value, "request");
  const summary = object(input.summary, "summary");
  const fallback = object(input.fallback, "fallback");
  if (!/^\d{4}-\d{2}$/.test(string(input.monthKey, "monthKey", 7))) {
    fail("monthKey must use YYYY-MM.");
  }
  number(summary.logCount, "logCount");
  number(summary.wateredCount, "wateredCount");
  number(summary.photoCount, "photoCount");
  number(summary.activePlantCount, "activePlantCount");
  optionalString(summary.mostActivePlantName, "mostActivePlantName", 120);
  string(fallback.title, "fallback.title", 120);
  string(fallback.body, "fallback.body", 800);
  return input;
}

function validateHealthRequest(value: unknown) {
  const input = object(value, "request");
  const careSummary = object(input.careSummary, "careSummary");
  const localAnalysis = object(input.localAnalysis, "localAnalysis");
  object(localAnalysis.signalSummary, "signalSummary");
  string(input.plantId, "plantId", 120);
  string(input.speciesName, "speciesName", 120);
  array(
    input.photoUris,
    "photoUris",
    (item) => string(item, "photoUri", 500),
    6,
  );
  array(
    input.recentLogNotes,
    "recentLogNotes",
    (item) => string(item, "logNote", 500),
    8,
  );
  number(careSummary.wateringIntervalDays, "wateringIntervalDays", 1, 365);
  number(careSummary.reminderCount, "reminderCount", 0, 100);
  number(localAnalysis.confidence, "confidence", 0, 1);
  if (
    !["growth", "dryness", "stable", "unclear"].includes(
      String(localAnalysis.classification),
    )
  ) {
    fail("classification is invalid.");
  }
  nullableObject(input.fallback, "fallback");
  return input;
}

function validateIdentifyRequest(value: unknown) {
  const input = object(value, "request");
  optionalString(input.imageUri, "imageUri", 1000);
  const imageBase64 = optionalString(input.imageBase64, "imageBase64", 8_000_000);
  const mimeType = optionalString(input.mimeType, "mimeType", 80);
  if (!imageBase64) {
    fail("imageBase64 is required for cloud species identification.");
  }
  if (!mimeType || !mimeType.startsWith("image/")) {
    fail("mimeType must be an image/* type.");
  }
  return input;
}

function validateReminderRequest(value: unknown) {
  const input = object(value, "request");
  string(input.plantName, "plantName", 120);
  string(input.speciesName, "speciesName", 120);
  number(input.wateringIntervalDays, "wateringIntervalDays", 1, 365);
  number(input.defaultWateringHour, "defaultWateringHour", 0, 23);
  boolean(input.reminderEnabled, "reminderEnabled");
  return input;
}

function validateCareLogRequest(value: unknown) {
  const input = object(value, "request");
  const fallback = object(input.fallback, "fallback");
  string(input.note, "note", 1200);
  string(input.logType, "logType", 80);
  if (fallback.refinedNote != null) {
    string(fallback.refinedNote, "fallback.refinedNote", 1200);
  }
  array(
    fallback.suggestedTags,
    "suggestedTags",
    (item) => {
      const tag = string(item, "tag", 80);
      if (!OBSERVATION_TAGS.has(tag)) {
        fail("suggestedTags contains an unsupported tag.");
      }
      return tag;
    },
    6,
  );
  return input;
}

function validateArchiveRequest(value: unknown) {
  const input = object(value, "request");
  array(
    input.items,
    "items",
    (item) => {
      const entry = object(item, "archive item");
      string(entry.plantId, "plantId", 120);
      string(entry.plantName, "plantName", 120);
      array(
        entry.photoUris,
        "photoUris",
        (uri) => string(uri, "photoUri", 500),
        12,
      );
      return entry;
    },
    20,
  );
  return input;
}

function validateStreakRequest(value: unknown) {
  const input = object(value, "request");
  const summary = object(input.summary, "summary");
  number(summary.currentStreakDays, "currentStreakDays");
  number(summary.overdueCount, "overdueCount");
  number(summary.dueSoonCount, "dueSoonCount");
  nullableObject(input.fallback, "fallback");
  return input;
}

const CARE_SCHEDULE_TYPES = new Set([
  "water",
  "mist",
  "feed",
  "repot",
  "prune",
  "inspect",
]);

function validateCareScheduleSuggestionItem(value: unknown, index: number) {
  const item = object(value, `suggestion[${index}]`);
  string(item.plantId, "plantId", 120);
  string(item.plantName, "plantName", 80);
  const careType = string(item.careType, "careType", 40);
  if (!CARE_SCHEDULE_TYPES.has(careType)) {
    fail("careType is invalid.");
  }
  const dueDate = string(item.suggestedDueDate, "suggestedDueDate", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    fail("suggestedDueDate must use YYYY-MM-DD.");
  }
  number(item.frequencyDays, "frequencyDays", 1, 365);
  const confidence = string(item.confidence, "confidence", 20);
  if (!["low", "medium", "high"].includes(confidence)) {
    fail("confidence is invalid.");
  }
  string(item.reason, "reason", 280);
  return item;
}

function validateCareScheduleRequest(value: unknown) {
  const input = object(value, "request");
  number(input.horizonDays, "horizonDays", 7, 90);
  array(
    input.plants,
    "plants",
    (item, index) => {
      const plant = object(item, `plants[${index}]`);
      string(plant.plantId, "plantId", 120);
      string(plant.plantName, "plantName", 80);
      string(plant.speciesName, "speciesName", 120);
      number(plant.wateringIntervalDays, "wateringIntervalDays", 1, 365);
      if (
        plant.daysSinceWatered != null &&
        typeof plant.daysSinceWatered !== "number"
      ) {
        fail("daysSinceWatered must be a number or null.");
      }
      string(plant.healthStatus, "healthStatus", 40);
      array(
        plant.enabledReminderTypes,
        "enabledReminderTypes",
        (type) => string(type, "reminderType", 40),
        8,
      );
      array(
        plant.recentCareTypes,
        "recentCareTypes",
        (type) => string(type, "careType", 40),
        12,
      );
      optionalString(plant.speciesCareHint, "speciesCareHint", 280);
      return plant;
    },
    50,
  );
  array(
    input.fallbackSuggestions,
    "fallbackSuggestions",
    validateCareScheduleSuggestionItem,
    12,
  );
  return input;
}

function validateCareScheduleResponse(value: unknown) {
  const input = object(value, "response");
  array(
    input.suggestions,
    "suggestions",
    validateCareScheduleSuggestionItem,
    12,
  );
  return input;
}

function validateNonNullObject(value: unknown, label: string) {
  object(value, label);
  return value;
}

export const AI_REQUEST_VALIDATORS: Record<string, Validator> = {
  "generate-dashboard-insight": validateDashboardRequest,
  "generate-journal-summary": validateJournalRequest,
  "generate-health-insight": validateHealthRequest,
  "identify-plant": validateIdentifyRequest,
  "refine-care-log": validateCareLogRequest,
  "generate-streak-nudge": validateStreakRequest,
  "optimize-reminders": validateReminderRequest,
  "curate-archive-gallery": validateArchiveRequest,
  "generate-care-schedule": validateCareScheduleRequest,
};

export const AI_RESPONSE_VALIDATORS: Record<string, Validator> = {
  "generate-dashboard-insight": (value) =>
    validateNonNullObject(value, "response"),
  "generate-journal-summary": (value) =>
    validateNonNullObject(value, "response"),
  "generate-health-insight": (value) =>
    validateNonNullObject(value, "response"),
  "identify-plant": (value) => validateNonNullObject(value, "response"),
  "refine-care-log": (value) => validateNonNullObject(value, "response"),
  "generate-streak-nudge": (value) => validateNonNullObject(value, "response"),
  "optimize-reminders": (value) => validateNonNullObject(value, "response"),
  "curate-archive-gallery": (value) => validateNonNullObject(value, "response"),
  "generate-care-schedule": validateCareScheduleResponse,
};

export function validateAiRequest<T>(functionName: string, value: unknown): T {
  const validator = AI_REQUEST_VALIDATORS[functionName];
  if (!validator) {
    fail(`No request validator configured for ${functionName}.`);
  }
  return validator(value) as T;
}

export function validateAiResponse<T>(functionName: string, value: unknown): T {
  const validator = AI_RESPONSE_VALIDATORS[functionName];
  if (!validator) {
    fail(`No response validator configured for ${functionName}.`);
  }
  return validator(value) as T;
}

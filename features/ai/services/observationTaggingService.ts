import { requestCareLogRefinement } from "@/features/ai/api/aiClient";
import type {
  ObservationTag,
  RefinedCareLogSuggestion,
} from "@/features/ai/types/ai";
import { withRefinedCareLogSource } from "@/features/ai/utils/aiMappers";
import { parseRefinedCareLogResponse } from "@/features/ai/utils/aiValidators";
import type { CareLogType } from "@/types/models";

const NOTE_TAG_MARKER = "\n\nTags: ";

const TAG_PATTERNS: Array<{ tag: ObservationTag; patterns: RegExp[] }> = [
  {
    tag: "new growth",
    patterns: [/\bnew growth\b/i, /\bnew leaf\b/i, /\bunfurl/i, /\bsprout/i],
  },
  {
    tag: "yellowing leaves",
    patterns: [/\byellow/i, /\bchlorosis/i, /\bbrowning edge/i, /\bcrisp/i],
  },
  {
    tag: "dry soil",
    patterns: [/\bdry soil\b/i, /\bdry\b/i, /\bthirst/i, /\bcrispy\b/i],
  },
  {
    tag: "pest concern",
    patterns: [/\bpest/i, /\bgnat/i, /\bmite/i, /\bthrip/i, /\bbug/i],
  },
  {
    tag: "pruning",
    patterns: [/\bprun/i, /\btrim/i, /\bcut back\b/i, /\bpropagat/i],
  },
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function extractObservationTags(note: string, logType: CareLogType) {
  const normalized = normalizeWhitespace(note);
  const tags = new Set<ObservationTag>();

  for (const candidate of TAG_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      tags.add(candidate.tag);
    }
  }

  if (logType === "prune" || logType === "repot") {
    tags.add("pruning");
  }

  if (logType === "inspect" && normalized && tags.size === 0) {
    tags.add("stable condition");
  }

  if (logType === "note" && /\bsteady|stable|holding\b/i.test(normalized)) {
    tags.add("stable condition");
  }

  return Array.from(tags);
}

export function refineCareLogNote(note: string) {
  const normalized = normalizeWhitespace(note);
  if (normalized.length < 12) {
    return null;
  }

  const refined = sentenceCase(normalized);
  return /[.!?]$/.test(refined) ? refined : `${refined}.`;
}

export function parseStructuredCareLogNote(note?: string | null) {
  const raw = note?.trim() ?? "";
  if (!raw) {
    return { body: "", tags: [] as ObservationTag[] };
  }

  const markerIndex = raw.lastIndexOf(NOTE_TAG_MARKER);
  if (markerIndex === -1) {
    return { body: raw, tags: [] as ObservationTag[] };
  }

  const body = raw.slice(0, markerIndex).trim();
  const tagSection = raw.slice(markerIndex + NOTE_TAG_MARKER.length);
  const tags = tagSection
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ObservationTag =>
      [
        "new growth",
        "yellowing leaves",
        "dry soil",
        "pest concern",
        "pruning",
        "stable condition",
      ].includes(value),
    );

  return { body, tags };
}

export function formatCareLogNoteForStorage(input: {
  note: string;
  tags: ObservationTag[];
}) {
  const body = input.note.trim();
  if (!input.tags.length) {
    return body;
  }

  return `${body}${NOTE_TAG_MARKER}${input.tags.join(", ")}`.trim();
}

export function buildCareLogNoteForSave(input: {
  originalNote: string;
  acceptedRefinement?: string | null;
  tags: ObservationTag[];
}) {
  const noteToPersist =
    input.acceptedRefinement?.trim() || input.originalNote.trim();

  return formatCareLogNoteForStorage({
    note: noteToPersist,
    tags: input.tags,
  });
}

export async function getCareLogAssistance(input: {
  note: string;
  logType: CareLogType;
}) {
  const fallback = {
    refinedNote: refineCareLogNote(input.note),
    suggestedTags: extractObservationTags(input.note, input.logType),
  };

  const cloud = await requestCareLogRefinement({
    note: input.note,
    logType: input.logType,
    fallback,
  });
  const parsedCloud = parseRefinedCareLogResponse(cloud);

  return parsedCloud
    ? withRefinedCareLogSource(parsedCloud, "cloud")
    : withRefinedCareLogSource(fallback, "local");
}

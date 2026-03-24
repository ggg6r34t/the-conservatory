import { requestCareLogRefinement } from "@/features/ai/api/aiClient";
import { withRefinedCareLogSource } from "@/features/ai/schemas/aiMappers";
import { parseRefinedCareLogResponse } from "@/features/ai/schemas/aiValidators";
import type { ObservationTag } from "@/features/ai/types/ai";
import type { CareLogType } from "@/types/models";

const NOTE_TAG_MARKER = "\n\nTags: ";
const NOTE_META_PREFIX = "\n\n[meta:";
const NOTE_META_SUFFIX = "]";
const VALID_OBSERVATION_TAGS: ObservationTag[] = [
  "new growth",
  "yellowing leaves",
  "dry soil",
  "pest concern",
  "pruning",
  "stable condition",
];

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

function normalizeObservationTags(values: string[]) {
  const unique = new Set(
    values
      .map((value) => value.trim().toLowerCase())
      .filter((value): value is ObservationTag =>
        VALID_OBSERVATION_TAGS.includes(value as ObservationTag),
      ),
  );

  return Array.from(unique);
}

function parseMetaEnvelope(raw: string) {
  const markerIndex = raw.lastIndexOf(NOTE_META_PREFIX);
  if (markerIndex === -1 || !raw.endsWith(NOTE_META_SUFFIX)) {
    return null;
  }

  const body = raw.slice(0, markerIndex).trim();
  const payload = raw.slice(
    markerIndex + NOTE_META_PREFIX.length,
    raw.length - NOTE_META_SUFFIX.length,
  );

  try {
    const parsed = JSON.parse(payload) as { tags?: string[] };
    const tags = normalizeObservationTags(parsed.tags ?? []);
    return { body, tags };
  } catch {
    return null;
  }
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

  const metaEnvelope = parseMetaEnvelope(raw);
  if (metaEnvelope) {
    return metaEnvelope;
  }

  const markerIndex = raw.lastIndexOf(NOTE_TAG_MARKER);
  if (markerIndex === -1) {
    return { body: raw, tags: [] as ObservationTag[] };
  }

  const body = raw.slice(0, markerIndex).trim();
  const tagSection = raw.slice(markerIndex + NOTE_TAG_MARKER.length);
  const tags = normalizeObservationTags(tagSection.split(","));

  return { body, tags };
}

export function formatCareLogNoteForStorage(input: {
  note: string;
  tags: ObservationTag[];
}) {
  const body = input.note.trim();
  const tags = normalizeObservationTags(input.tags);

  if (!tags.length) {
    return body;
  }

  return `${body}${NOTE_META_PREFIX}${JSON.stringify({ tags })}${NOTE_META_SUFFIX}`.trim();
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

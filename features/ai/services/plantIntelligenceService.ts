import { requestPlantIdentification } from "@/features/ai/api/aiClient";
import {
  createCacheKeyHash,
  normalizeSpeciesLabel,
  withSpeciesSource,
} from "@/features/ai/schemas/aiMappers";
import { hasVerifiedModelGeneration } from "@/features/ai/schemas/aiGenerationMeta";
import { parseSpeciesSuggestionResponse } from "@/features/ai/schemas/aiValidators";
import { getCachedValue, setCachedValue } from "@/features/ai/services/aiCache";
import { encodeLocalImageForAi } from "@/features/ai/services/imageEncodingService";
import { incrementUsage } from "@/features/billing/services/usageClient";
import { getDatabase } from "@/services/database/sqlite";
import type {
  IdentifyPlantResponse,
  SpeciesSuggestion,
} from "@/features/ai/types/ai";

const SPECIES_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const SPECIES_CACHE_PREFIX = "ai:species:";

const URI_KEYWORDS: Array<{
  keywords: string[];
  species: string;
  confidence: number;
  careProfileHint: string;
}> = [
  {
    keywords: ["monstera", "deliciosa"],
    species: "Monstera Deliciosa",
    confidence: 0.72,
    careProfileHint:
      "A bright indirect position usually keeps its rhythm steady.",
  },
  {
    keywords: ["pothos", "epipremnum"],
    species: "Pothos",
    confidence: 0.7,
    careProfileHint:
      "A forgiving first rhythm with moderate drying between waterings.",
  },
  {
    keywords: ["ficus", "fiddle"],
    species: "Fiddle Leaf Fig",
    confidence: 0.68,
    careProfileHint:
      "A steady window position and even watering tend to work best.",
  },
  {
    keywords: ["snake", "sansevieria", "dracaena"],
    species: "Snake Plant",
    confidence: 0.7,
    careProfileHint: "A drier cadence is often the safer opening move.",
  },
];

function getSpeciesCacheKey(imageUri: string) {
  return `${SPECIES_CACHE_PREFIX}${createCacheKeyHash(imageUri)}`;
}

function inferSpeciesLocally(imageUri: string): SpeciesSuggestion | null {
  const normalizedUri = imageUri.toLowerCase();
  const match = URI_KEYWORDS.find((candidate) =>
    candidate.keywords.some((keyword) => normalizedUri.includes(keyword)),
  );

  if (!match) {
    return null;
  }

  return withSpeciesSource(
    {
      species: normalizeSpeciesLabel(match.species),
      confidence: match.confidence,
      careProfileHint: match.careProfileHint,
    },
    "local",
  );
}

export async function getSpeciesSuggestion(input: { imageUri: string; cloudAllowed: boolean; userId?: string }) {
  const cacheKey = getSpeciesCacheKey(input.imageUri);
  const cached = await getCachedValue<SpeciesSuggestion>(cacheKey);
  if (cached) {
    return cached;
  }

  const localSuggestion = inferSpeciesLocally(input.imageUri);
  if (localSuggestion) {
    await setCachedValue(cacheKey, localSuggestion, SPECIES_CACHE_TTL_MS);
  }

  if (!input.cloudAllowed) {
    return localSuggestion;
  }

  const encoded = await encodeLocalImageForAi(input.imageUri);
  if (!encoded) {
    return localSuggestion;
  }

  const remote = await requestPlantIdentification({
    imageUri: input.imageUri,
    imageBase64: encoded.imageBase64,
    mimeType: encoded.mimeType,
  });
  const parsedRemote = parseSpeciesSuggestionResponse(
    remote as IdentifyPlantResponse | null,
  );

  const cloudExplanation = parsedRemote?.confidenceExplanation?.trim();
  if (parsedRemote && hasVerifiedModelGeneration(remote) && cloudExplanation) {
    const suggestion: SpeciesSuggestion = {
      ...withSpeciesSource(parsedRemote, "cloud"),
      confidenceExplanation: cloudExplanation,
    };
    await setCachedValue(cacheKey, suggestion, SPECIES_CACHE_TTL_MS);
    if (input.userId) {
      const db = await getDatabase();
      await incrementUsage(db, input.userId, "ai_species_identification");
    }
    return suggestion;
  }

  return localSuggestion;
}

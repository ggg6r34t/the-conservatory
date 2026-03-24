import type {
  CareDefaultsSuggestion,
  LightCondition,
  SpeciesSuggestion,
} from "@/features/ai/types/ai";

type SpeciesProfile = {
  keywords: string[];
  wateringIntervalDays: number;
  lowLightDelta: number;
  directLightDelta: number;
  lightSummary: string;
  careProfileHint: string;
};

const DEFAULT_PROFILE: SpeciesProfile = {
  keywords: [],
  wateringIntervalDays: 7,
  lowLightDelta: 1,
  directLightDelta: -1,
  lightSummary: "Bright indirect light remains the safest opening recommendation.",
  careProfileHint: "Begin conservatively, then refine after a few care cycles.",
};

const SPECIES_PROFILES: SpeciesProfile[] = [
  {
    keywords: ["monstera", "philodendron", "pothos"],
    wateringIntervalDays: 8,
    lowLightDelta: 2,
    directLightDelta: -1,
    lightSummary: "Bright indirect light keeps foliage balanced and calm.",
    careProfileHint: "Allow the top layer of soil to dry before the next full soak.",
  },
  {
    keywords: ["ficus", "fiddle"],
    wateringIntervalDays: 7,
    lowLightDelta: 2,
    directLightDelta: -1,
    lightSummary: "Steady filtered light helps this specimen keep an even rhythm.",
    careProfileHint: "A consistent position matters more than frequent adjustment.",
  },
  {
    keywords: ["snake", "sansevieria", "dracaena", "zz"],
    wateringIntervalDays: 14,
    lowLightDelta: 2,
    directLightDelta: -2,
    lightSummary: "Tolerates lower light, but brighter filtered light keeps growth cleaner.",
    careProfileHint: "Err on the dry side and avoid overwatering.",
  },
  {
    keywords: ["peace lily", "spathiphyllum", "fern", "calathea"],
    wateringIntervalDays: 5,
    lowLightDelta: 1,
    directLightDelta: -1,
    lightSummary: "Soft indirect light supports even moisture and calmer leaf edges.",
    careProfileHint: "This plant prefers moisture consistency over long dry intervals.",
  },
];

function resolveSpeciesProfile(speciesName: string) {
  const normalized = speciesName.trim().toLowerCase();
  return (
    SPECIES_PROFILES.find((profile) =>
      profile.keywords.some((keyword) => normalized.includes(keyword)),
    ) ?? DEFAULT_PROFILE
  );
}

function applyLightAdjustment(
  baseInterval: number,
  lightCondition: LightCondition,
  profile: SpeciesProfile,
) {
  if (lightCondition === "low") {
    return baseInterval + profile.lowLightDelta;
  }

  if (lightCondition === "direct") {
    return Math.max(3, baseInterval + profile.directLightDelta);
  }

  return baseInterval;
}

export function buildCareDefaults(input: {
  speciesName: string;
  lightCondition: LightCondition;
  acceptedSuggestion?: SpeciesSuggestion | null;
}): CareDefaultsSuggestion {
  const profile = resolveSpeciesProfile(input.speciesName);
  const lowConfidence =
    input.acceptedSuggestion != null && input.acceptedSuggestion.confidence < 0.65;
  const wateringIntervalDays = lowConfidence
    ? Math.max(6, Math.min(10, profile.wateringIntervalDays))
    : applyLightAdjustment(
        profile.wateringIntervalDays,
        input.lightCondition,
        profile,
      );

  return {
    wateringIntervalDays,
    lightSummary: profile.lightSummary,
    careProfileHint: profile.careProfileHint,
    explanation: lowConfidence
      ? "A restrained starting rhythm based on a tentative species match."
      : `Suggested from species and ${input.lightCondition} light.`,
  };
}

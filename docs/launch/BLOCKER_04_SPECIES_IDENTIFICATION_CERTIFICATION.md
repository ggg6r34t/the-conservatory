# Blocker 04 — Species Identification Truthfulness Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Species suggestions must distinguish on-device URI heuristics from vision-model results, require verified edge `meta` before labeling `source: "cloud"`, and ship visual evidence copy (`confidenceExplanation`) for cloud matches.

## Remediation Summary

| Area | Action | Evidence |
|------|--------|----------|
| Vision input | Client encodes photos via `encodeLocalImageForAi`; edge receives `imageBase64` + `images` on `runAiJsonCompletion` | `plantIntelligenceService.ts`, `identify-plant/index.ts` |
| No fallback echo | Edge uses `runAiJsonCompletion` (Blocker 01) | `identify-plant/index.ts` |
| Cloud provenance | `source: "cloud"` only when `hasVerifiedModelGeneration()` and non-empty `confidenceExplanation` | `plantIntelligenceService.ts` |
| Local honesty | URI keyword heuristic labeled `local`; banner says “not a vision model result” | `SpeciesSuggestionBanner.tsx` |
| Quota | `useSpeciesSuggestion` gates `cloudAllowed`; usage increments only on verified cloud success | `useSpeciesSuggestion.ts`, `ai-quota-enforcement.test.ts` |
| Model prompt | Requires `confidenceExplanation` describing visual evidence | `aiPromptBuilders.ts` IDENTIFY_SYSTEM |

## Free vs Premium Behavior

| Tier | Behavior |
|------|----------|
| Free (within quota) | Cloud vision allowed when `canUseFeature('ai_species_identification')` passes |
| Free (quota exhausted) | Local heuristic only; UI shows quota state in `PlantForm` |
| Premium | Cloud allowed without daily free cap via entitlement |
| Any tier, encoding failure | Falls back to local heuristic or null |

## Verification Commands

```bash
npm test -- --testPathPattern="species-identification|species-suggestion|ai-quota-enforcement|edge-functions-production" --runInBand
npm run typecheck
npm test -- --runInBand
```

## Results

| Check | Result |
|-------|--------|
| `tests/features/ai/species-identification-truthfulness.test.ts` | **PASS** |
| `tests/features/ai/ai-quota-enforcement.test.ts` (species) | **PASS** |
| `tests/features/ai/species-suggestion-banner.test.tsx` | **PASS** |
| `tests/supabase/edge-functions-production-hardening.test.ts` | **PASS** |
| Full suite | **568** tests — **PASS** |
| `npm run typecheck` | **PASS** |

## Deployment Checklist

1. Ensure provider keys are configured (same as Blocker 01).
2. Smoke-test plant add flow: local-only URI → banner shows pattern match copy.
3. Smoke-test cloud match → banner shows confidence % + visual explanation.
4. Exhaust free species quota → cloud call skipped, no usage increment.

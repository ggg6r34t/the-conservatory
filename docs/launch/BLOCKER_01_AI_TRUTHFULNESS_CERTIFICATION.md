# Blocker 01 — AI Truthfulness Certification

**Status:** PASS  
**Verified:** 2026-06-02

## Remediation Summary

Production AI infrastructure replaces fallback-echo edge handlers with multi-provider model execution, observability, and client-side provenance labeling.

## Code Evidence

| Requirement | Implementation |
|-------------|----------------|
| Provider abstraction (OpenAI, Anthropic, Google) | `supabase/functions/_shared/aiProvider.ts` |
| Timeout, retry, circuit breaker, failover | `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_RETRIES`, `circuitByProvider`, ordered `AI_PROVIDER_ORDER` |
| Cost tracking | `estimatedCostUsd` per completion; `record_edge_ai_request` RPC |
| Usage quotas | Existing `assertAiUsageQuota` + `consume_ai_usage` (unchanged) |
| Observability | `supabase/migrations/20260602140000_edge_ai_observability.sql`, `aiObservability.ts` |
| No fallback-only AI responses | Edge functions use `runAiJsonCompletion`; tests assert `not.toContain("body.fallback")` |
| Source labels | Responses include `meta`; client sets `source: "cloud"` only when `hasVerifiedModelGeneration()` |
| Species vision | `encodeLocalImageForAi` + `imageBase64` required on `identify-plant` |
| Confidence explanation | `confidenceExplanation` on species suggestions from model |

## Verification Commands

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm test -- --testPathPattern=tests/supabase --runInBand
```

## Results

| Check | Result |
|-------|--------|
| Jest | 144 suites, 529 tests — **PASS** |
| TypeScript | `tsc --noEmit` — **PASS** |
| Edge hardening tests | `tests/supabase/edge-functions-production-hardening.test.ts` — **PASS** |

## Deployment Requirements

Set at least one provider secret in Supabase before AI functions accept traffic:

- `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` and/or `GOOGLE_AI_API_KEY`
- Apply migration `20260602140000_edge_ai_observability.sql`

Without provider keys, edges return `503` and clients fall back to local insights (labeled `local`).

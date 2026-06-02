# Blocker 05 — Test Suite & Release Verification Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Confirm the enterprise audit’s failing suites are resolved, Blockers 01–04 remain green, and release gates (`typecheck`, `lint`, Jest) pass locally before Monday launch review.

## Remediation Summary (carried in Blockers 01–04)

| Area | Action | Evidence |
|------|--------|----------|
| Auth client tests | Mock `featureRequestCacheService` to avoid AsyncStorage/native deps in Jest | `tests/features/auth/*.test.ts` |
| AI quota / meta | Species and insight tests require `meta` for cloud provenance | `tests/features/ai/ai-quota-enforcement.test.ts` |
| Home insight | Mock `useCollectionStreak` / `useQueryClient` where needed | `tests/features/dashboard/home-insight-visibility.test.tsx` |
| Supabase security | Migration + RLS certification suite | `tests/supabase/supabase-security-certification.test.ts` |
| Premium / export | Export access policy + care-log window tests | `tests/features/export/*` |
| Species ID | Provenance + banner + edge hardening tests | Blocker 04 test files |

## Verification Commands

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
```

## Results

| Check | Result |
|-------|--------|
| Jest | **147** suites, **568** tests — **PASS** |
| TypeScript | `tsc --noEmit` — **PASS** |
| ESLint | **0 errors** (8 pre-existing warnings in feature-requests routes) |
| E2E | `tests/e2e/auth-onboarding-flow.test.tsx` — **PASS** |

## CI Note

No GitHub Actions workflow is checked into this repository. Run the commands above in CI or locally before release.

## Deployment Checklist

1. Run full Jest in CI with `--runInBand` (matches local recommendation).
2. Block merge on `typecheck` failure.
3. Treat new ESLint **errors** as release blockers; warnings in `app/feature-requests/*` are known debt.

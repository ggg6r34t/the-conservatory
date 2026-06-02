# Phase 03 — Observability and Revenue Funnels Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Production crash reporting (Sentry), performance span instrumentation, and monetization funnel events required for launch analytics.

## Remediation Summary

| Area | Action | Evidence |
|------|--------|----------|
| Crash reporting | Optional Sentry via `EXPO_PUBLIC_SENTRY_DSN`; init in `Providers`, wrap root layout | `crashReportingService.ts`, `app/_layout.tsx` |
| User context | Sentry user set/cleared with auth lifecycle | `BillingBootstrapProvider.tsx` |
| DB bootstrap errors | `captureException` on SQLite init failure | `Providers.tsx` |
| PostHog production | Sends when key present; dev uses `EXPO_PUBLIC_ENABLE_ANALYTICS=true` for live capture | `analyticsService.ts` |
| AI funnel | `trackAiFeatureUsed` on verified cloud completions (all 5 AI features) | AI services |
| Export funnel | `export_collection_started/completed/failed` + `measureAsync` timing | `useExportCollectionData.ts` |
| Premium funnel | `premium_screen_viewed` on `/premium` and `/subscription-plans` | `app/premium.tsx`, `app/subscription-plans.tsx` |
| Quota funnel | `quota_reached` for species identification exhaustion | `useSpeciesSuggestion.ts` |
| Performance | `performance_span` PostHog events via `measureAsync` | `performanceMonitoringService.ts` |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Product analytics (required for production capture) |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | Set `true` in dev builds to send live PostHog events |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash and performance trace reporting |

## Verification Commands

```bash
npm test -- --testPathPattern="crash-reporting|revenue-funnel|analytics-service" --runInBand
npm run typecheck
npm test -- --runInBand
```

## Results

| Check | Result |
|-------|--------|
| `tests/services/crash-reporting-service.test.ts` | **PASS** |
| `tests/services/revenue-funnel-analytics.test.ts` | **PASS** |
| `tests/services/analytics-service.test.ts` | **PASS** |
| `npm run typecheck` | **PASS** |
| Full suite (`npm test -- --runInBand`) | **577 tests PASS** (151 suites) |

## Deployment Checklist

1. Set `EXPO_PUBLIC_SENTRY_DSN` in EAS secrets for production builds.
2. Set `EXPO_PUBLIC_POSTHOG_API_KEY` for production analytics.
3. Confirm PostHog funnels: `premium_screen_viewed` → `purchase_started` → `purchase_completed`.
4. Trigger a test crash in staging and verify the event appears in Sentry.

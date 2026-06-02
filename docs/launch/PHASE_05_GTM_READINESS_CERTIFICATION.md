# Phase 05 — GTM Readiness Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Product analytics events required for post-launch activation, retention, monetization, and operations funnels in PostHog.

## Event Catalog

| Funnel | Events | Wiring |
|--------|--------|--------|
| Acquisition | `user_signed_up`, `user_logged_in` | `features/auth/api/authClient.ts` |
| Onboarding | `onboarding_*`, `onboarding_completed` | Onboarding screens + `useOnboarding.ts` |
| Activation | `activation_first_plant_created` | `createPlant()` when first active plant |
| Session | `app_session_started` | `BillingBootstrapProvider` after analytics init |
| Premium conversion | `premium_screen_viewed` → `purchase_*` | Phase 03 (`app/premium.tsx`, `subscription-plans.tsx`) |
| Churn / tier | `subscription_activated`, `subscription_downgraded` | Tier transitions in `BillingBootstrapProvider` |
| AI usage | `ai_feature_used` | Phase 03 AI services |
| Quota pressure | `quota_reached` | Species ID, plant create, progress photos |
| Export | `export_collection_*` | `useExportCollectionData.ts` |
| Backup adoption | `backup_screen_viewed`, `backup_sync_*`, `backup_auto_sync_*` | `app/data-backup.tsx` |
| Import / restore | `import_collection_*` | `app/import-collection-data.tsx` |
| Retention signals | `streak_*` | `trackStreakEvent` in streak analytics |
| Sync health | `sync_item_abandoned`, `sync_item_deleted_before_sync` | `services/database/sync.ts` |

## PostHog Dashboards (configure in PostHog UI)

1. **Onboarding:** `onboarding_welcome_cta_pressed` → `onboarding_completed`
2. **Activation:** `user_signed_up` → `activation_first_plant_created`
3. **Premium:** `premium_screen_viewed` → `purchase_completed`
4. **Backup:** `backup_screen_viewed` → `backup_sync_completed`
5. **Churn:** `subscription_downgraded` cohort vs `subscription_activated`

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Production event capture |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | Dev builds: set `true` for live capture |

## Verification Commands

```bash
npm test -- --testPathPattern="gtm-funnel|revenue-funnel|analytics-service" --runInBand
npm run typecheck
npm test -- --runInBand
```

## Results

| Check | Result |
|-------|--------|
| `tests/services/gtm-funnel-analytics.test.ts` | **PASS** |
| `tests/services/revenue-funnel-analytics.test.ts` | **PASS** |
| `tests/services/analytics-service.test.ts` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run typecheck` | **PASS** |
| Full suite (`npm test -- --runInBand`) | **581 tests PASS** (152 suites) |

## Deployment Checklist

1. Create PostHog funnels listed above for launch week monitoring.
2. Set `EXPO_PUBLIC_POSTHOG_API_KEY` on production EAS profile.
3. Validate `app_session_started` and `purchase_completed` in a staging build with `EXPO_PUBLIC_ENABLE_ANALYTICS=true`.

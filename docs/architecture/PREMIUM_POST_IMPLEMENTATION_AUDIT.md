# Premium Post-Implementation Verification Audit

Audit date: 2026-06-05 (pass 1). Evidence = file paths and symbols cited below.

## Findings register

| ID | Finding | Status (pass 1) | Evidence |
|----|---------|-----------------|----------|
| P1 | Central `featureAccess` helpers (`assertFeatureAccess`, `cloudAllowedForFeature`) | **Fully Resolved** | `features/billing/services/featureAccess.ts` |
| P2 | `ai_care_schedule` classified premium in `FEATURE_REQUIRES_PREMIUM` | **Fully Resolved** | `features/billing/constants.ts:31`, `tests/features/billing/ai-care-schedule-classification.test.ts` |
| P3 | Care calendar accept/dismiss mutations gated at service layer | **Fully Resolved** | `features/care-calendar/hooks/useCareCalendarActions.ts` (`assertFeatureAccess("ai_care_schedule")`) |
| P4 | Care calendar UI hides AI filter/actions for free users | **Fully Resolved** | `CareCalendarFilters.tsx` (`showAiFilter`), `CareCalendarAgenda.tsx` (`allowAiSuggestionActions`), `app/care-calendar.tsx` (filter reset, `UpgradePrompt`) |
| P5 | `useCareCalendar` does not merge AI events when not premium | **Fully Resolved** | `useCareCalendar.ts:89-95` |
| P6 | AI hooks use `cloudAllowedForFeature` not raw `isPremium` | **Fully Resolved** | `useJournalSummary.ts`, `useDashboardInsight.ts`, `useArchiveCuration.ts`, `useCareCalendar.ts` |
| P7 | Specimen tag creation gated in service layer | **Fully Resolved** | `specimenTagsService.ts` (`assertFeatureAccess("specimen_tag_create")`) |
| P8 | Premium export gated via `assertFeatureAccess` | **Fully Resolved** | `exportAccessPolicy.ts` |
| P9 | `PREMIUM_ENTITLEMENTS.md` documents policy | **Fully Resolved** | `docs/architecture/PREMIUM_ENTITLEMENTS.md` |
| P10 | Paywall copy aligned (photos vs records, new features) | **Fully Resolved** | `app/premium.tsx` `PREMIUM_FEATURES` |
| P11 | Unit tests for feature access + calendar actions | **Fully Resolved** | `tests/features/billing/feature-access.test.ts`, `tests/features/care-calendar/care-calendar-actions-premium.test.ts` |
| P12 | Certification tests reference new guards | **Fully Resolved** | `tests/launch/premium-features-certification.test.ts` |
| P13 | Photo sync deferred without premium | **Fully Resolved** (pre-existing) | `supabaseSyncAdapter.ts:732` |
| P14 | Premium themes require recurring subscription | **Fully Resolved** (pre-existing) | `themeAccess.ts` `hasRecurringPremiumSubscription` |
| P15 | Free-tier quotas unchanged | **Fully Resolved** (pre-existing) | `entitlementService.ts`, `plantsClient.ts` |
| P16 | `aiClient` blocks premium-only edge invokes client-side | **Fully Resolved** (pre-existing) | `aiClient.ts:90-94` |
| P17 | `optimize-reminders` edge requires premium while client feature is free | **Still Open** | `supabase/functions/optimize-reminders/index.ts:83`; client never calls edge (`requestReminderOptimization` unused) |
| P18 | `useCareCalendar` still fetches suggestions query when `cloudAllowed` false | **Partially Resolved** | `enabled` lacked `cloudAllowed` guard |
| P19 | `useCareCalendar` exposes cached `suggestions` array to UI when free | **Partially Resolved** | returned `suggestions` without `cloudAllowed` check |
| P20 | `upsertCareScheduleSuggestion` allows `source: ai_suggested` without premium check | **Still Open** | `careScheduleSuggestionsClient.ts` — bypass if called outside actions |
| P21 | `resolvePlantLibraryFilter` uses `isPremium` not `canUseFeature` | **Partially Resolved** | equivalent today; not using shared helper |
| P22 | `ARCHITECTURE.md` links to entitlement doc | **Still Open** | no cross-link |
| P23 | Enterprise certification covers all `cloudAllowedForFeature` hooks | **Partially Resolved** | certification partial |

## Pass 1 summary

- **Fully Resolved:** 16
- **Partially Resolved:** 4
- **Still Open:** 3
- **Deferred:** 0
- **Not Actionable:** 0

Remediation in pass 2 targets P17–P23.

---

## Pass 2 remediation (2026-06-05)

| ID | Action | Status (pass 2) | Evidence |
|----|--------|-----------------|----------|
| P17 | Remove `assertPremiumEntitlement` from `optimize-reminders`; quota-only | **Fully Resolved** | `supabase/functions/optimize-reminders/index.ts`; `tests/supabase/edge-entitlement-guards.test.ts` |
| P18 | Disable suggestions query when `!cloudAllowed` | **Fully Resolved** | `useCareCalendar.ts` `enabled: ... && cloudAllowed` |
| P19 | Return empty `suggestions` when free | **Fully Resolved** | `useCareCalendar.ts` ternary on `cloudAllowed` |
| P20 | Gate `source: ai_suggested` in `upsertCareScheduleSuggestion` | **Fully Resolved** | `careScheduleSuggestionsClient.ts`; `care-schedule-suggestions-client-premium.test.ts` |
| P21 | Library filter downgrade via `isFeatureAllowed` | **Fully Resolved** | `plantLibraryFilterService.ts` |
| P22 | Cross-link entitlement docs from `ARCHITECTURE.md` | **Fully Resolved** | `ARCHITECTURE.md:127-127` |
| P23 | Expand certification string checks | **Fully Resolved** | `premium-features-certification.test.ts` |

## Pass 2 summary

- **Fully Resolved:** 23 (all registered findings)
- **Partially Resolved:** 0
- **Still Open:** 0
- **Deferred:** 0
- **Not Actionable:** 0

**Verification commands (pass 2):**

```bash
npm run typecheck
npm test -- --testPathPattern="feature-access|care-calendar|premium-features-certification|edge-entitlement|edge-functions-production" --runInBand
```

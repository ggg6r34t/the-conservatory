# Premium Post-Implementation Verification Audit

Audit evidence = file paths and symbols cited below. Status labels: **Fully Resolved**, **Partially Resolved**, **Still Open**, **Deferred**, **Not Actionable**.

---

## Pass 1 — Premium policy baseline (2026-06-05)

| ID | Finding | Status (pass 1) | Evidence |
|----|---------|-----------------|----------|
| P1 | Central `featureAccess` helpers | **Fully Resolved** | `features/billing/services/featureAccess.ts` |
| P2 | `ai_care_schedule` in `FEATURE_REQUIRES_PREMIUM` | **Fully Resolved** | `features/billing/constants.ts:31` |
| P3 | Accept/dismiss gated | **Fully Resolved** | `useCareCalendarActions.ts` |
| P4 | UI hides AI filter/actions for free | **Fully Resolved** | `CareCalendarFilters.tsx`, `CareCalendarAgenda.tsx`, `app/care-calendar.tsx` |
| P5 | No AI events when not premium | **Fully Resolved** | `useCareCalendar.ts` |
| P6 | AI hooks use `cloudAllowedForFeature` | **Fully Resolved** | `useJournalSummary.ts`, `useDashboardInsight.ts`, `useArchiveCuration.ts`, `useCareCalendar.ts` |
| P7–P16 | Export, specimen tags, docs, tests, photo sync, themes, quotas, `aiClient` | **Fully Resolved** | See pass 1 archive in git history |
| P17 | `optimize-reminders` premium mismatch | **Still Open** (pass 1) | — |
| P18–P23 | Query enablement, upsert bypass, library filter, docs, certification | **Partially Resolved** / **Still Open** (pass 1) | — |

**Pass 1 summary:** 16 Fully · 4 Partially · 3 Still Open

---

## Pass 2 — Premium policy remediation (2026-06-05)

| ID | Action | Status (pass 2) | Evidence |
|----|--------|-----------------|----------|
| P17 | `optimize-reminders` quota-only | **Fully Resolved** | `optimize-reminders/index.ts` (no `assertPremiumEntitlement`); `edge-entitlement-guards.test.ts` |
| P18 | Disable suggestions query when `!cloudAllowed` | **Fully Resolved** | `useCareCalendar.ts` `enabled: ... && cloudAllowed` |
| P19 | Empty `suggestions` when free | **Fully Resolved** | `useCareCalendar.ts` ternary |
| P20 | Gate `source: ai_suggested` upsert | **Fully Resolved** | `careScheduleSuggestionsClient.ts`; `care-schedule-suggestions-client-premium.test.ts` |
| P21 | Library filter via `isFeatureAllowed` | **Fully Resolved** | `plantLibraryFilterService.ts` |
| P22 | `ARCHITECTURE.md` cross-link | **Fully Resolved** | `docs/architecture/ARCHITECTURE.md` |
| P23 | Certification expanded | **Fully Resolved** | `premium-features-certification.test.ts` |

**Pass 2 summary:** 23/23 Fully Resolved (premium policy register closed)

---

## Pass 3 — Cloud AI care schedule (`generate-care-schedule`) (2026-06-05)

### Pass 3a — Initial verification (pre-remediation)

| ID | Finding | Status (pass 3a) | Evidence |
|----|---------|------------------|----------|
| C1 | Edge function `generate-care-schedule` deployed in repo | **Fully Resolved** | `supabase/functions/generate-care-schedule/index.ts` |
| C2 | `assertPremiumEntitlement` before body parse | **Fully Resolved** | `index.ts:31-38`; `edge-entitlement-guards.test.ts` |
| C3 | `assertAiUsageQuota` for `ai_care_schedule` | **Fully Resolved** | `index.ts:40-42` |
| C4 | Model-backed via `runAiJsonCompletion` | **Fully Resolved** | `index.ts:45-51`; `edge-functions-production-hardening.test.ts` |
| C5 | Request validator (plants, horizon, fallback) | **Fully Resolved** | `aiSchemas.ts` `validateCareScheduleRequest` |
| C6 | Response validator validates suggestion items | **Still Open** | Response used `validateNonNullObject` only |
| C7 | Prompt builder `buildCareScheduleAiRequest` | **Fully Resolved** | `aiPromptBuilders.ts` |
| C8 | `aiClient` maps function → `ai_care_schedule` | **Fully Resolved** | `aiClient.ts:54`, `requestCareScheduleSuggestions` |
| C9 | `aiClient` blocks premium edge when not entitled | **Fully Resolved** | `aiClient.ts:92-96` |
| C10 | Client types + Zod parse | **Fully Resolved** | `features/ai/types/ai.ts`; `aiValidators.ts` `careScheduleSuggestionSchema` |
| C11 | Cloud invoke gated by `hasVerifiedModelGeneration` | **Fully Resolved** | `careCalendarAiScheduleService.ts:472` |
| C12 | On-device fallback when cloud fails | **Fully Resolved** | `careCalendarAiScheduleService.ts:487-493` |
| C13 | `buildCareScheduleCloudRequest` plant context | **Fully Resolved** | `careCalendarAiScheduleService.ts` |
| C14 | Cloud suggestions normalized (horizon, dismissed, reminder conflict) | **Fully Resolved** | `normalizeCloudCareScheduleSuggestions` |
| C15 | Analytics `trackAiFeatureUsed("ai_care_schedule")` on cloud | **Fully Resolved** | `analyticsService.ts`; `careCalendarAiScheduleService.ts:483` |
| C16 | Service tests (cloud + fallback) | **Fully Resolved** | `care-calendar-ai-schedule-service.test.ts` |
| C17 | Edge listed in `AI_FUNCTIONS` / `PREMIUM_FUNCTIONS` | **Fully Resolved** | `edge-functions-production-hardening.test.ts` |
| C18 | Deploy runbook includes function | **Fully Resolved** | `docs/SUPABASE_EDGE_FUNCTIONS.md` |
| C19 | `PREMIUM_ENTITLEMENTS.md` documents cloud edge | **Fully Resolved** | `PREMIUM_ENTITLEMENTS.md` |
| C20 | Paywall lists Care Calendar AI | **Fully Resolved** | `app/premium.tsx` `PREMIUM_FEATURES` |
| C21 | Certification cites `generate-care-schedule` | **Still Open** | `premium-features-certification.test.ts` lacked edge string |
| C22 | `BLOCKER_01` documents care schedule AI | **Still Open** | No row in truthfulness table |
| C23 | Provenance: local hints labeled same as cloud AI | **Partially Resolved** | `getCareCalendarSourceLabel` returned one string for all AI suggestions |
| C24 | Premium UI note when on-device fallback active | **Still Open** | No banner when `source === "local"` |

**Pass 3a summary:** 18 Fully · 1 Partially · 4 Still Open

### Pass 3b — Remediation (2026-06-05)

| ID | Action | Status (pass 3b) | Evidence |
|----|--------|-----------------|----------|
| C6 | `validateCareScheduleResponse` validates `suggestions[]` | **Fully Resolved** | `aiSchemas.ts` `validateCareScheduleResponse` |
| C21 | Certification checks edge + `hasVerifiedModelGeneration` | **Fully Resolved** | `premium-features-certification.test.ts` |
| C22 | `BLOCKER_01` care calendar row | **Fully Resolved** | `docs/launch/BLOCKER_01_AI_TRUTHFULNESS_CERTIFICATION.md` |
| C23 | Distinct labels: cloud / local / cached | **Fully Resolved** | `careCalendarSourceLabels.ts`; `suggestionDerivation` on events; `care-calendar-source-labels.test.ts` |
| C24 | Premium banner when cloud unavailable | **Fully Resolved** | `app/care-calendar.tsx` (`aiSuggestionDerivation === "local"`) |

**Pass 3b summary:** 23/23 Fully Resolved (cloud AI register closed)

---

## Pass 3c — Re-verification (2026-06-05)

All findings **C1–C24** and **P1–P23** are **Fully Resolved** with code evidence. No **Still Open**, **Partially Resolved**, or unverified claims remain in scope.

| Register | Fully | Partially | Still Open | Deferred | Not Actionable |
|----------|-------|-----------|------------|----------|----------------|
| Premium policy (P1–P23) | 23 | 0 | 0 | 0 | 0 |
| Cloud AI care schedule (C1–C24) | 23 | 0 | 0 | 0 | 0 |

**Verification commands (pass 3c):**

```bash
npm run typecheck
npm test -- --testPathPattern="care-calendar|feature-access|premium-features-certification|edge-entitlement|edge-functions-production|ai-care-schedule" --runInBand
```

**Deploy (production):** `supabase functions deploy generate-care-schedule` after secrets and migrations (not verifiable in git).

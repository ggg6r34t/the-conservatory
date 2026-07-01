# AI Manual Test Checklist

Living checklist for manually verifying AI features in The Conservatory (local fallbacks + Supabase Edge Functions).

**Last reviewed:** 2026-06-03

## When to update this doc

Add or edit a row in [Feature matrix](#feature-matrix) whenever you:

- add or rename an edge function under `supabase/functions/`
- wire a new AI hook or screen entry point
- change free vs premium gating in `features/billing/constants.ts`
- change cloud vs local behavior or user-visible source labels

Related source-of-truth files:

- Edge functions: `supabase/functions/*/index.ts`
- Client invoke map: `features/ai/api/aiClient.ts` (`AI_FUNCTION_FEATURES`)
- Gating: `features/billing/constants.ts` (`FEATURE_REQUIRES_PREMIUM`, free quotas)
- Source labels: `features/ai/services/insightSourcePresentation.ts`
- Secrets / deploy: [ENV_AND_SUPABASE_SECRETS.md](../ENV_AND_SUPABASE_SECRETS.md), [SUPABASE_EDGE_FUNCTIONS.md](../SUPABASE_EDGE_FUNCTIONS.md)

---

## Prerequisites

| Requirement | Why |
|-------------|-----|
| Signed in (Supabase Auth) | Edge functions require a valid JWT |
| Online | Cloud AI invokes `supabase.functions.invoke` |
| `EXPO_PUBLIC_SUPABASE_URL` + anon key in app `.env` | Client can reach the project |
| Edge functions deployed | See [SUPABASE_EDGE_FUNCTIONS.md](../SUPABASE_EDGE_FUNCTIONS.md) |
| Supabase secrets: at least one AI provider key (`OPENAI_API_KEY`, etc.) | `assertAiProvidersConfigured()` on LLM functions |
| Supabase secrets: `REVENUECAT_SECRET_API_KEY` | Server-side Premium checks on premium-gated functions |
| Native dev build (not Expo Go) for billing tests | RevenueCat / store sandbox |
| `EXPO_PUBLIC_USE_MOCK_BILLING=false` for real Premium | Mock billing skips RevenueCat entirely |
| Premium granted in RevenueCat for test user's **Supabase UUID** | Edge Premium guard uses RC server API, not in-app mock state |

**Test data:** at least one plant with care logs; progress photos for archive curation and species ID; a broken streak for streak nudge.

---

## How to tell cloud vs local worked

| Surface | Cloud success | Local fallback |
|---------|---------------|----------------|
| Insights (health, dashboard, journal) | **Enhanced insight** — *Prepared with cloud assistance using your plant data.* | **Generated locally** — *Prepared on this device from your care history.* |
| Species suggestion | Model confidence text; not *on-device pattern match only* | *On-device pattern match only — not a vision model result.* |

Always confirm in **Supabase Dashboard → Edge Functions → Logs** (`request_success`, `ai_request_completed`, `success: true`).

---

## Feature matrix

| Edge function | Gated feature | Tier | Free quota (app) | Screen / entry point | Primary code paths | Uses LLM | Pass criteria |
|---------------|---------------|------|------------------|----------------------|--------------------|----------|---------------|
| `generate-health-insight` | `ai_health_insight` | Free + Premium | 1 / plant / month | Plant detail → health insight card | `features/ai/hooks/useHealthInsight.ts`, `PlantDetailHealthInsight.tsx` | Yes | Insight renders; **Enhanced** when cloud succeeds |
| `identify-plant` | `ai_species_identification` | Free + Premium | 3 / month | Add plant, onboarding quick start, `PlantForm` photo | `useSpeciesSuggestion`, `plantIntelligenceService.ts` | Yes (vision) | Species banner with model confidence (real photo) |
| `refine-care-log` | `ai_health_insight` | Free + Premium | Shares health quota class | Care log form → assist / refine | `CareLogForm.tsx`, `observationTaggingService.ts` | Yes | Note refinement; edge log for `refine-care-log` |
| `optimize-reminders` | `smart_reminder_optimization` | Free + Premium | Edge daily/monthly limits | After watering, interval edits, care reminders | `reminderOptimizationService.ts`, `care-reminders.tsx` | No (deterministic) | Next due / explanation updates; edge success |
| `generate-streak-nudge` | `ai_health_insight` | Free + Premium | Edge limits | Home / Garden when streak broken | `useStreakRecoveryNudge`, `streakNudgeService.ts` | Yes | Recovery nudge copy appears |
| `generate-dashboard-insight` | `ai_dashboard_editorial` | **Premium** | — | Home / Garden tab editorial | `app/(tabs)/index.tsx`, `useDashboardInsight` | Yes | Editorial block shows **Enhanced** |
| `generate-journal-summary` | `ai_journal_narrative` | **Premium** | — | Journal tab monthly narrative | `app/(tabs)/journal.tsx`, `useJournalSummary` | Yes | Month summary **Enhanced** |
| `curate-archive-gallery` | `ai_archive_curation` | **Premium** | — | Archive gallery | `app/archive-gallery.tsx`, `useArchiveCuration` | Yes | Before/after pairs (2+ photos per plant) |
| `generate-care-schedule` | `ai_care_schedule` | **Premium** | — | Care calendar | `app/care-calendar.tsx`, `careCalendarAiScheduleService.ts` | Yes | Schedule suggestions visible (Premium) |

### Adding a new AI feature (template)

```markdown
| `your-function-name` | `gated_feature_id` | Free / Premium | quota if any | Route → UI | hooks/services files | Yes/No | Expected user-visible outcome |
```

Also register in `features/ai/api/aiClient.ts` (`AI_FUNCTION_FEATURES`) and add a row here.

---

## 15-minute smoke test

Run in order:

1. [ ] **Health insight** — plant detail → **Enhanced** (free quota OK)
2. [ ] **Species ID** — add plant with real photo → not on-device-only copy
3. [ ] **Dashboard editorial** — home tab → **Enhanced** (Premium)
4. [ ] **Journal summary** — journal tab → **Enhanced** (Premium)
5. [ ] **Care calendar** — open calendar → AI schedule suggestions (Premium)

Optional same session:

- [ ] Care log refine
- [ ] Archive gallery curation
- [ ] Streak nudge (break streak first)
- [ ] Reminder optimization (log watering)

---

## Tier coverage matrix

| Feature | Free cloud | Premium cloud | Local fallback |
|---------|------------|---------------|----------------|
| Health insight | Yes (quota) | Yes | Yes |
| Species ID | Yes (quota) | Yes | Weak keyword match only |
| Care log refine | Yes | Yes | Yes |
| Reminder optimize | Yes | Yes | Yes |
| Streak nudge | Yes | Yes | Yes |
| Dashboard editorial | No | Yes | Yes |
| Journal narrative | No | Yes | Yes |
| Archive curation | No | Yes | Yes |
| Care schedule | No | Yes | Limited / none |

---

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| Always **Generated locally** | Edge error, offline, auth failure — check function logs |
| Premium AI still local | `EXPO_PUBLIC_USE_MOCK_BILLING=true`, or no RC grant on Supabase user UUID |
| `premium_required` in logs | Premium not active in RevenueCat for that user |
| `quota_exceeded` | Free or edge daily/monthly limits hit |
| Species always on-device | Quota exhausted, image encode failed, or `identify-plant` error |
| No streak nudge | Streak not broken or insufficient plant/log data |
| `No AI provider API keys` in logs | Missing `OPENAI_API_KEY` (or other provider) in Supabase secrets |

---

## Premium test account setup

1. Set `EXPO_PUBLIC_USE_MOCK_BILLING=false` and restart Expo (`npx expo start -c`).
2. Sign in on a native dev build.
3. Copy **Supabase Auth user UUID**.
4. RevenueCat → **Customers** → grant promotional entitlement **`premium`** to that App User ID.
5. Relaunch app; confirm Premium in Profile.

Mock billing `purchasePackage()` updates in-app tier only — **edge Premium checks still use RevenueCat**.

---

## Supabase log checks

Dashboard → **Edge Functions** → **Logs**. Filter by function name from the matrix above.

Look for:

- `event: request_success`
- `event: ai_request_completed` with `success: true` and `provider: openai` (or fallback provider)
- Absence of `premium_required`, `quota_exceeded`, `auth_required`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-03 | Initial checklist — 9 AI edge functions |

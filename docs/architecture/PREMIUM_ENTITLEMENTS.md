# Premium Entitlements

## Purpose

This document is the product and engineering source of truth for **what requires Premium**, **what stays free**, and **why**. It supports honest paywall copy, consistent gates in code, and audits without guessing.

Premium means an **active RevenueCat entitlement** (`premium`, exposed as `useSubscription().isPremium`). Monthly, annual, and lifetime SKUs all set `tier === "premium"` for feature gates, except **premium themes** (recurring monthly/annual only — see below).

---

## Design principles (the “why” behind the split)

### 1. Local-first core is free

The Conservatory is a **care journal and planner**, not a subscription-only database. Users must be able to add plants, log watering, set reminders, and open the Care Calendar **without paying**. That data lives in SQLite on device first; losing Premium must never delete or lock out existing records.

**Implication:** CRUD for plants, care logs, reminders (all types: water, mist, feed, repot, prune, inspect), graveyard/memorials, and **derived** calendar events stay free.

### 2. Premium funds cost, depth, and “pro collector” workflows

Premium pays for capabilities that are **expensive** (cloud AI, photo storage/sync), **deep** (full history export, advanced organization), or **optional polish** (editorial AI copy, specimen QR labels). These are upsells, not prerequisites to track a few houseplants.

### 3. Freemium quotas instead of hard walls where possible

For features that have marginal cost but high trial value — health insights, species ID, extra plants/photos — we use **generous free tiers** (`FREE_*` in `features/billing/constants.ts`) so new users experience value before subscribing. Quotas are enforced in `canUseFeature()` when `FEATURE_REQUIRES_PREMIUM[feature]` is `false`.

### 4. Truthful surfaces

Backup/sync UI must not imply “everything is in the cloud” for free users. Photos are explicitly Premium for upload; plants/logs/reminders can still sync. Export has **basic** (free) vs **enhanced** (premium) payloads. See `docs/architecture/SYNC_AND_DATA_MODEL.md`.

### 5. Defense in depth

Gates exist at UI (hide or downgrade), hooks (`cloudAllowedForFeature`), mutations (`assertFeatureAccess`), API clients (e.g. specimen tags, schedule upsert), `aiClient` (block premium edge calls), and Supabase edge functions (`assertPremiumEntitlement` where applicable). See [Enforcement](#enforcement-in-code).

---

## How access is decided

```text
User action
    → useSubscription().isPremium (RevenueCat)
    → canUseFeature(feature, isPremium, usageSnapshot)
         ├─ FEATURE_REQUIRES_PREMIUM[feature] && !isPremium → requires_premium
         ├─ isPremium → allowed
         └─ else → quota checks (plants, photos, insights, species ID)
```

Helpers in `features/billing/services/featureAccess.ts`:

- `cloudAllowedForFeature` — may this feature call cloud AI / show cloud-derived UI?
- `assertFeatureAccess` — throw before mutating (accept AI suggestion, create tag, enhanced export, etc.)
- `isFeatureAllowed` — boolean check (e.g. library filter downgrade)

Post-implementation audit history: `docs/architecture/PREMIUM_POST_IMPLEMENTATION_AUDIT.md`.

---

## Premium-only capabilities

### Hard-gated features (`FEATURE_REQUIRES_PREMIUM: true`)

| Feature key | What the user gets | Why Premium |
|-------------|-------------------|-------------|
| `ai_journal_narrative` | Monthly AI-written journal story from care logs and collection context | Cloud LLM cost; editorial “signature” experience for engaged subscribers |
| `ai_dashboard_editorial` | AI-generated Garden dashboard copy (care rhythm, tone) | Same — optional narrative layer, not required to see due plants/reminders |
| `ai_archive_curation` | **Cloud** AI pairing of before/after photos in archive/memorial flows | Model cost; **local** pairing (`curateArchiveLocally`) remains free so graveyard still works offline |
| `ai_care_schedule` | Care Calendar **AI rhythm suggestions** (repot/inspect/mist hints), accept/dismiss, “AI suggested” filter | Optional intelligence on top of honest local schedule; accepting writes reminders or `care_schedule_suggestions` — must not be bypassed without subscription |
| `specimen_tag_create` | Generate and sync botanical QR specimen tags per plant | Pro-collector workflow; physical-digital bridge; gated in UI and `ensureSpecimenTag` |
| `advanced_library_filters` | Library views: group by **location**, group by **species** | Power-user organization; free users keep default list/search; filter downgrades to `all` via `resolvePlantLibraryFilter` |
| `premium_export` | Enhanced export: full care log history, photo metadata, status snapshots, specimen tags in JSON | Portability for serious collectors; basic export stays free with 60-day log window |

**Enforcement highlights:** `aiClient` returns null for premium features when not entitled; edge functions `generate-journal-summary`, `generate-dashboard-insight`, `curate-archive-gallery`, `generate-care-schedule` use `assertPremiumEntitlement`. Care calendar: `useCareCalendar` + `useCareCalendarActions` + `careScheduleSuggestionsClient` when `source: "ai_suggested"`.

### Premium-only paths (not a `GatedFeature` flag)

| Capability | Behavior | Why Premium |
|------------|----------|-------------|
| **Photo cloud backup** | `supabaseSyncAdapter` **defers** photo upload/sync when `!getEntitlementState()`; records sync continues | Storage and bandwidth; largest backup cost driver |
| **Premium themes** | Themes with `access: "premium"` require **active monthly or annual** subscription (`hasRecurringPremiumSubscription`) | Recurring benefit for subscribers; lifetime SKU does not unlock themes by design |

**Paywall reference:** `app/premium.tsx` → `PREMIUM_FEATURES` must match this section. Quota-limited features must not be described as “Premium only” without noting free allowances.

---

## Free with quotas (try before you subscribe)

| Capability | Free limit | Constant | Why not hard-gated |
|------------|------------|----------|-------------------|
| Active plants | 10 | `FREE_PLANT_LIMIT` | Enough for a real home collection trial; power users upgrade |
| Progress photos per plant | 3 | `FREE_PROGRESS_PHOTOS_PER_PLANT` | Progress tracking is core; cap limits storage abuse |
| AI health insights per plant / month | 1 | `FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH` | Demonstrates AI value per plant without unlimited API spend |
| Species identification / month | 3 | `FREE_PLANT_IDENTIFICATIONS_PER_MONTH` | Onboarding hook when adding plants |
| Care log history (UI + basic export) | 60 days | `FREE_CARE_LOG_HISTORY_DAYS` | Recent history is enough for casual care; full archive is premium export |

Premium removes quotas (unlimited plants/photos/insights/IDs) and lifts the export history window via `premium_export`.

**Enforcement:** `plantsClient` (plant/photo limits), `useHealthInsight` / `useSpeciesSuggestion` (`canUseFeature` + quota), `getCareLogHistorySinceForDisplay` / `exportAccessPolicy`.

---

## Free — core product (no subscription required)

### Collection and care tracking

| Area | Included free | Why free |
|------|---------------|----------|
| Plants | Create, edit, archive, graveyard, memorials (within plant quota) | Core loop |
| Care logs | Water, mist, feed, repot, prune, inspect, pest, note | Core loop |
| Reminders | All reminder types, notifications (local scheduling) | Core loop |
| Care Reminders screen | Edit frequency, enable/disable, calendar header link | Operational care, not AI upsell |
| Library | Default list, search, non-premium filters | Discovery without paywall |
| Journal | View logs and highlights (AI **narrative** is premium) | History is yours locally |
| Dashboard | Plants due, streaks, structural UI (AI **editorial** is premium) | At-a-glance care still works |

### Care Calendar (botanical planner)

| Free | Why |
|------|-----|
| Month and agenda views | Planner is a first-class surface, not a Premium teaser |
| Events derived from plant watering intervals, enabled **reminders**, and **accepted** `care_schedule_suggestions` (user already committed) | Only show real scheduled care — no fake tasks |
| Log care, mark done, reschedule (reminder types → `care_reminders`; other types → `care_schedule_suggestions` with `source: manual`) | Acting on schedule must work for everyone |
| Filters: All, Water, Feed, Mist, Repot, Prune, Inspect, Overdue | Derived-data filters |
| Deep link `?plantId=` | Plant detail entry |
| Pull-to-refresh, reduced-motion month navigation | Accessibility and local-first refresh |

| Premium (`ai_care_schedule`) | Why |
|------------------------------|-----|
| AI-generated suggestions on the calendar | Premium subscribers call `generate-care-schedule` (quota-limited); on-device heuristics remain the fallback when cloud is unavailable |
| Accept / dismiss suggestions | Persists reminders or AI-sourced schedules |
| “AI suggested” filter | Surfaces only premium suggestion rows |
| Upgrade prompt on calendar when free | Clear upsell without blocking the planner |

Free users see: *“Showing your local care schedule. Premium adds optional AI-assisted rhythm suggestions.”*

### Sync and backup (partial)

| Free | Premium |
|------|---------|
| Sync **plants**, care logs, reminders, schedules, tags metadata, etc. when Supabase is configured | Same, plus **photo** upload/replay |
| Local DB always authoritative | Cloud augments, does not replace device truth |

Copy in `deriveCloudSyncStatus`: records backup for all; photos require Premium.

### Smart reminders

| Free | Premium |
|------|---------|
| `optimizeReminderTiming` runs **locally** when setting reminders or watering (all users) | Same algorithm |
| — | Extra **explanation** line on Care Reminders when `isPremium && optimizedReminder.explanation` |

`smart_reminder_optimization` is **not** in `FEATURE_REQUIRES_PREMIUM`. The `optimize-reminders` edge function (unused by app today) uses auth + quota only, not `assertPremiumEntitlement`.

### Scan specimen tag

Scanning/decoding tags can be explored; **creating** tags is premium (`specimen_tag_create`).

---

## What Premium is not

- **Not** a license to use the app — free tier is a complete care tracker within quotas.
- **Not** required for offline use — SQLite works without network.
- **Not** a guarantee that every record is in the cloud — `lastSuccessfulSyncAt` is inferred; see sync doc.
- **Not** the same as “AI enabled globally” — health insight and species ID have free monthly allowances.

---

## Enforcement in code

| Layer | Location | Role |
|-------|----------|------|
| Feature flags | `features/billing/constants.ts` → `FEATURE_REQUIRES_PREMIUM` | Single boolean map per `GatedFeature` |
| Evaluation | `features/billing/services/entitlementService.ts` → `canUseFeature` | Premium vs quota logic |
| Helpers | `features/billing/services/featureAccess.ts` | Shared assert / cloudAllowed |
| Runtime premium flag | `services/entitlementState.ts` ← `useSubscription` | Sync adapter, specimen tags, export |
| AI client | `features/ai/api/aiClient.ts` | Block invoke before network |
| Care calendar | `useCareCalendar`, `useCareCalendarActions`, `careScheduleSuggestionsClient` | No AI suggestions / mutations when free |
| AI hooks | `useJournalSummary`, `useDashboardInsight`, `useArchiveCuration` | `cloudAllowedForFeature` |
| Library | `plantLibraryFilterService`, `app/(tabs)/library.tsx` | Downgrade premium filters |
| Export | `exportAccessPolicy`, `exportService` | Basic vs enhanced payload |
| Photos | `supabaseSyncAdapter` | Defer photo sync |
| Themes | `features/theme/themeAccess.ts` | Recurring subscription check |
| Edge | `supabase/functions/*/index.ts` | Server-side premium for journal, dashboard, archive curation |

When adding a gated capability: update `GatedFeature`, `FEATURE_REQUIRES_PREMIUM`, enforcement at mutation boundary, `PREMIUM_FEATURES` if user-facing, and this document.

---

## Maintenance

- **Paywall:** Keep `app/premium.tsx` aligned with tables above.
- **Audits:** Re-run checks in `PREMIUM_POST_IMPLEMENTATION_AUDIT.md` after entitlement changes.
- **Sync/export truth:** Update `SYNC_AND_DATA_MODEL.md` if backup or export semantics change.

Related: [ARCHITECTURE.md](./ARCHITECTURE.md), [SYNC_AND_DATA_MODEL.md](./SYNC_AND_DATA_MODEL.md).

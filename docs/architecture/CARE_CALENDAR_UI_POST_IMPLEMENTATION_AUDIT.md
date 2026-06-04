# Care Calendar UI Post-Implementation Verification Audit

Audit evidence = file paths and symbols cited below. Status labels: **Fully Resolved**, **Partially Resolved**, **Still Open**, **Deferred**, **Not Actionable**.

Scope: Month/day selection UX, task card action chips, month day markers (icons + plant avatars), and related screen shell behavior (not premium AI or sync).

**Cross-reference:** Premium/cloud AI audits in [PREMIUM_POST_IMPLEMENTATION_AUDIT.md](./PREMIUM_POST_IMPLEMENTATION_AUDIT.md).

---

## Register A — Month shell & task cards (U1–U10)

### Pass A1 — Initial verification (pre-remediation)

| ID | Finding | Status (pass A1) | Evidence |
|----|---------|------------------|----------|
| U1 | Duplicate day title in month view (screen + agenda) | **Fully Resolved** | `app/care-calendar.tsx` `showDayHeaders={false}`; `CareCalendarAgenda.tsx` `showDayHeaders` gate |
| U2 | Selected day indicator appeared square (full-cell press target) | **Fully Resolved** | `CareCalendarMonthGrid.tsx` `dayPressable` + `CARE_CALENDAR_DAY_MARKER_SIZE` circle |
| U3 | Task actions stacked vertically | **Fully Resolved** | `CareCalendarTaskCard.tsx` `actions` `flexDirection: "row"` |
| U4 | Log care used `PrimaryButton` unlike sibling chips | **Fully Resolved** | `CareCalendarTaskCard.tsx` — no `PrimaryButton`; shared `ActionChip` |
| U5 | Cannot deselect a selected calendar day | **Fully Resolved** | `toggleSelectedDateKey` + `handleSelectDate` in `care-calendar.tsx` |
| U6 | Action chip touch targets too small | **Fully Resolved** | `CareCalendarTaskCard.tsx` `minHeight: 40`, padding `16×10`, font `14/20` |
| U7 | Automated tests for UI behavior | **Still Open** | No dedicated UI interaction tests |
| U8 | Plant deep link re-applied selection after user deselect on refresh | **Still Open** | `useEffect` depended on `calendar.isLoading` + `plantDeepLink` |
| U9 | Audit register documented | **Still Open** | No pass-1 doc |
| U10 | `formatAgendaDayTitle` used for month day heading (Today/Tomorrow) | **Fully Resolved** | `care-calendar.tsx` imports `formatAgendaDayTitle` |

**Pass A1 summary:** 7 Fully · 0 Partially · 3 Still Open

### Pass A2 — Remediation

| ID | Action | Status (pass A2) | Evidence |
|----|--------|------------------|----------|
| U7 | Add `care-calendar-ui-interaction.test.tsx` | **Fully Resolved** | `tests/features/care-calendar/care-calendar-ui-interaction.test.tsx` |
| U8 | Apply plant deep link once per `plantId` via `appliedPlantDeepLinkRef` | **Fully Resolved** | `app/care-calendar.tsx` |
| U9 | Publish audit register (this file) | **Fully Resolved** | This document |
| U7b | Export `toggleSelectedDateKey` for testable selection logic | **Fully Resolved** | `careCalendarDerivationService.ts` |

**Pass A2 summary:** 10/10 Fully Resolved

---

## Register B — Month day markers (M1–M16)

Production policy: replace dot row only; max 2 care-type icons; max 3 plant avatars; active statuses only; no visual `+N` badge; overdue tint on icons; sprout fallback; include events already in `calendar.events` (including `ai_suggested` when premium merge supplies them).

### Pass B1 — Initial verification (2026-06-05, pre-remediation)

| ID | Finding | Status (pass B1) | Evidence |
|----|---------|------------------|----------|
| M1 | Dot markers removed from month grid | **Fully Resolved** | `CareCalendarMonthGrid.tsx` — no `styles.marker`; uses `CareCalendarDayMarkers` |
| M2 | Max 2 distinct care-type icons per day | **Fully Resolved** | `careCalendarDayMarkers.ts` `CARE_CALENDAR_MAX_DAY_CARE_ICONS = 2` |
| M3 | Max 3 unique plant avatars per day | **Fully Resolved** | `CARE_CALENDAR_MAX_DAY_PLANT_AVATARS = 3` |
| M4 | Only `overdue`, `due_today`, `upcoming` counted | **Fully Resolved** | `ACTIVE_EVENT_STATUSES` in `careCalendarDayMarkers.ts` |
| M5 | `completed` excluded from markers | **Partially Resolved** | Filter in code; no test for `skipped` |
| M6 | Priority: overdue → due today → upcoming | **Fully Resolved** | `statusPriority`, `compareEvents`, care-type map sort |
| M7 | No visual `+N` overflow badge on cells | **Fully Resolved** | No `CareCalendarDayOverflowBadge` in repo |
| M8 | Overdue uses `colors.error` on care icons only | **Fully Resolved** | `CareCalendarDayMarkers.tsx` `iconColor` |
| M9 | Sprout fallback when `primaryPhotoUri` missing | **Fully Resolved** | `CareCalendarDayMarkers.tsx` `MaterialCommunityIcons` `sprout` |
| M10 | Avatars use `primaryPhotoUri` from plant list | **Fully Resolved** | `deriveCareCalendarDayMarkers` `plantById.get` |
| M11 | Screen passes `plants` into month grid | **Fully Resolved** | `app/care-calendar.tsx` `plants={calendar.plants}` |
| M12 | `ai_suggested` events included when in day event list | **Partially Resolved** | Derivation does not filter `source`; no test |
| M13 | Care-type icons aligned with `CareLogForm` | **Partially Resolved** | `careCalendarCareTypeIcons.ts`; no parity test |
| M14 | VoiceOver includes marker summary | **Fully Resolved** | `buildDayAccessibilityLabel` + `buildDayMarkerAccessibilityDetail` |
| M15 | Unit tests for marker derivation | **Partially Resolved** | `care-calendar-day-markers.test.ts` — limits/completed only |
| M16 | UI tests reference marker components | **Fully Resolved** | `care-calendar-ui-interaction.test.tsx` source checks |
| M17 | Marker audit pass documented | **Still Open** | Register B not in this file |
| M18 | Component smoke test for `CareCalendarDayMarkers` | **Still Open** | No render test |
| M19 | `skipped` status exclusion tested | **Still Open** | — |
| M20 | Accessibility overflow detail tested | **Still Open** | Verbal `plus N more` in a11y only |

**Pass B1 summary:** 11 Fully · 4 Partially · 5 Still Open

### Pass B2 — Remediation (2026-06-05)

| ID | Action | Status (pass B2) | Evidence |
|----|--------|------------------|----------|
| M5 | Test `skipped` exclusion | **Fully Resolved** | `care-calendar-day-markers.test.ts` |
| M12 | Test `ai_suggested` inclusion in derivation | **Fully Resolved** | Same file |
| M13 | Parity test vs `CareLogForm` icons | **Fully Resolved** | `care-calendar-care-type-icons.test.ts` |
| M15 | Tests for due-today icon priority + a11y detail | **Fully Resolved** | `care-calendar-day-markers.test.ts` |
| M17 | Register B in this audit doc | **Fully Resolved** | Register B (this section) |
| M18 | Component smoke + no overflow badge | **Fully Resolved** | `care-calendar-day-markers-component.test.tsx` |
| M19 | `skipped` test | **Fully Resolved** | `care-calendar-day-markers.test.ts` |
| M20 | `buildDayMarkerAccessibilityDetail` test | **Fully Resolved** | `care-calendar-day-markers.test.ts` |
| M16 | Shell wires `plants={calendar.plants}` in test | **Fully Resolved** | `care-calendar-ui-interaction.test.tsx` |
| — | `SCREEN_INVENTORY.md` notes marker UX | **Fully Resolved** | `docs/SCREEN_INVENTORY.md` `/care-calendar` |

**Pass B2 summary:** 16/16 Fully Resolved (register B closed)

---

## Pass C — Combined re-verification (2026-06-05)

Re-checked all **U1–U10** and **M1–M16** against current source and tests. No finding marked resolved without file/test evidence.

| Register | Fully | Partially | Still Open | Deferred | Not Actionable |
|----------|-------|-----------|------------|----------|----------------|
| Month shell & task cards (U1–U10) | 10 | 0 | 0 | 0 | 0 |
| Month day markers (M1–M16) | 16 | 0 | 0 | 0 | 0 |
| **Total** | **26** | **0** | **0** | **0** | **0** |

**Verification commands (pass C):**

```bash
npm run typecheck
npm test -- --testPathPattern="care-calendar" --runInBand
```

No unverified claims remain in Care Calendar UI scope.

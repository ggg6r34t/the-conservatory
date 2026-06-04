# Care Calendar UI Post-Implementation Verification Audit

Audit date: 2026-06-05. Evidence = file paths and symbols cited below.

Scope: Month/day selection UX, task card action chips, and related screen shell behavior (not premium AI or sync).

---

## Pass 1 — Initial verification (pre-remediation)

| ID | Finding | Status (pass 1) | Evidence |
|----|---------|-----------------|----------|
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

**Pass 1 summary:** 7 Fully · 0 Partially · 3 Still Open

---

## Pass 2 — Remediation (2026-06-05)

| ID | Action | Status (pass 2) | Evidence |
|----|--------|-----------------|----------|
| U7 | Add `care-calendar-ui-interaction.test.tsx` (toggle, headers, chips, marker) | **Fully Resolved** | `tests/features/care-calendar/care-calendar-ui-interaction.test.tsx` |
| U8 | Apply plant deep link once per `plantId` via `appliedPlantDeepLinkRef` | **Fully Resolved** | `app/care-calendar.tsx` |
| U9 | Publish audit register (this file) | **Fully Resolved** | `docs/architecture/CARE_CALENDAR_UI_POST_IMPLEMENTATION_AUDIT.md` |
| U7b | Export `toggleSelectedDateKey` for testable selection logic | **Fully Resolved** | `careCalendarDerivationService.ts` |

**Pass 2 summary:** 10/10 Fully Resolved

---

## Pass 3 — Re-verification (2026-06-05)

| Register | Fully | Partially | Still Open | Deferred | Not Actionable |
|----------|-------|-----------|------------|----------|----------------|
| Care Calendar UI (U1–U10) | 10 | 0 | 0 | 0 | 0 |

All findings have code or test evidence. No unverified claims remain in scope.

**Verification commands (pass 3):**

```bash
npm run typecheck
npm test -- --testPathPattern="care-calendar" --runInBand
```

**Cross-reference:** Premium/cloud AI audits remain in [PREMIUM_POST_IMPLEMENTATION_AUDIT.md](./PREMIUM_POST_IMPLEMENTATION_AUDIT.md).

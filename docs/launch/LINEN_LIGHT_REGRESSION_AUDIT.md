# Linen Light Regression Audit

**Date:** 2026-06-03  
**Scope:** Verify multi-theme expansion did not regress the original default theme (Linen Light).  
**Baseline source:** `git show a17a5d8^:styles/tokens.ts`, `plantStatusBadgePresentation.ts`, component tests.

## Phase 1 — Baseline Recovery

### Core palette (unchanged)

All Linen Light core tokens match the pre-expansion `styles/tokens.ts` export:

| Role | Baseline hex |
|------|----------------|
| primary | `#163828` |
| surface / background | `#fbf9f4` |
| onSurface | `#1b1c19` |
| secondaryFixed (thriving badge fill) | `#ffdbcf` |
| primaryFixed (thriving icon tile) | `#c5ebd4` |
| error / errorContainer | `#ba1a1a` / `#ffdad6` |
| outlineVariant | `#c1c8c2` |

### Shared layout tokens (unchanged)

`spacing`, `radius`, `typography`, and `shadow` (elevation) remain in `features/theme/tokens/shared.ts` and match the historical values.

### Status badge (pre-expansion behavior)

| State | Icon bg | Icon color | Badge bg | Badge text |
|-------|---------|------------|----------|------------|
| Thriving | `primaryFixed` | `primary` | `secondaryFixed` | `primary` |
| Stable | `surfaceContainerHigh` | `onSurfaceVariant` | same | same |
| Needs water | `errorContainer` | `error` | `errorContainer` | `onErrorContainer` |

## Phase 2 — Screen audit (Linen Light)

Static/code review against baseline. No automated visual snapshots in CI today.

| Screen | Status | Notes |
|--------|--------|-------|
| Garden / Dashboard | Pass | Uses `useTheme()` tokens; highlights use `primaryContainer` / `surfaceContainerHigh` (theme-aware, linen resolves to baseline hues). |
| Library | Pass | Status badges restored to core-token mapping. |
| Plant Detail | Pass | Care guide / activity use core + `withAlpha`; no dark-theme literals on linen. |
| Add/Edit Plant | Pass | Placeholders use `outlineVariant` (≈ former `#c6cbc5`). |
| Journal / Graveyard / Memorial | Pass | Semantic surfaces; reflection card uses `secondaryFixed` on linen. |
| Profile | Pass | Edit-badge shadow kept at `rgba(27, 28, 25, 0.1)`. |
| Interface Themes | Pass | Picker defaults via `resolveThemeId`. |
| Premium / Backup | Pass | Overlays use `withAlpha(primary, …)` — linen primary-based. |
| Onboarding (Quick Start / Permissions / Walkthrough) | Pass* | *WelcomeGateway / WalkthroughSlidePanel intentionally keep illustration gradients (documented exception). |
| Tab bar | Intentionally unchanged | Hardcoded white bar per product decision. |

## Phase 3 — Token regression

| Check | Result |
|-------|--------|
| Core hex values | **Unchanged** — locked in `linen-light-regression.test.ts` |
| Semantic `shadow` on linen | **Fixed** — override `rgba(27, 28, 25, 0.04)` (was derived `0.08`) |
| Default fallback theme | **linen-light** — `DEFAULT_THEME_ID`, DB default, settings default |
| New themes as default | **None** |

## Phase 4 — Component regression

| Component | Regression found | Remediation |
|-----------|------------------|-------------|
| PlantStatusBadge | **Yes** — thriving icon tile used `statusThriving` (`secondaryFixed`) instead of `primaryFixed` | Reverted presentation to core-token baseline |
| SecondaryButton (surface) | **Minor** — `colors.shadow` was `0.08` | Uses `shadow.shadowColor` from shared tokens (`0.04`) |
| TextInput placeholder | Acceptable | `#c6cbc5` → `outlineVariant` `#c1c8c2` (same RGB as prior border rgba base) |
| Other components | Pass | Token migration uses semantic/core resolution |

## Phase 5 — Persistence

| Scenario | Expected | Verified in tests |
|----------|----------|-------------------|
| Missing preference | linen-light | `theme-cache-storage.test.ts`, `linen-light-regression.test.ts` |
| Invalid preference | linen-light | `resolveThemeId` |
| DB default | linen-light | `migrations.ts` |
| Cache + server preference | Server wins when valid | `getBootstrapThemeId` |
| Premium theme lock | Not implemented | All catalog themes selectable; no premium-only theme IDs today |

**Hydration:** `BotanicalThemeProvider` initializes with `DEFAULT_THEME_ID`; `ThemeBootstrapProvider` reconciles cache/SQLite. Brief cache-only mismatch possible before bootstrap completes; default render is still linen-light.

## Phase 6 — Functional

No theme-related breakage identified in unit/integration tests. Full E2E not run in this pass; recommend smoke on linen-light device build before release.

## Phase 7 — Accessibility

`theme-accessibility.test.ts` — all catalog themes including linen pass WCAG AA checks. Status badge baseline preserves prior contrast pairings on linen.

## Phase 8 — Performance

- `buildThemeTokens` memoized per theme id in registry cache.
- Theme context `useMemo` depends on `activeThemeId` + `transitionProgress` only.
- No blocking hydration gate on first paint.

## Phase 9 — Automated tests added/updated

- `tests/features/theme/linen-light-regression.test.ts` — full core baseline + badge + shadow
- `tests/features/theme/theme-cache-storage.test.ts` — bootstrap fallbacks
- `tests/features/plants/plant-status-badge-presentation.test.ts` — restored canonical expectations

## Phase 10 — Remediation summary

1. **Plant status badge** — Restored pre-expansion core color mapping (thriving icon `primaryFixed`, badge `secondaryFixed`).
2. **Linen semantic shadow** — Derived light shadow `rgba(27, 28, 25, 0.04)` (not dark-theme `0.28`).
3. **SecondaryButton** — Surface variant uses shared `shadow.shadowColor` again.
4. **Profile edit badge** — Kept historical `rgba(27, 28, 25, 0.1)` shadow.
5. **Profile avatar loading overlay** — Restored `photoEditOverlay` (`backdrop` @ 0.45); reverted mistaken `imageOverlay` (surface @ 0.5).
6. **Destructive PrimaryButton gradient** — Linen override `dangerGradientEnd: #8c1414` (pre-expansion hardcoded end stop).

## Intentionally untouched (per product)

- `ConservatoryTabBar.tsx`
- `WelcomeGateway.tsx`, `WalkthroughSlidePanel.tsx` illustration gradients
- `OnboardingDebugScreen.tsx`
- Theme definition source files (except linen `shadow` semantic override)

## Validation commands

```bash
npx tsc --noEmit
npm test -- --testPathPattern="linen-light|theme-registry|plant-status-badge|theme-cache" --runInBand
expo lint
```

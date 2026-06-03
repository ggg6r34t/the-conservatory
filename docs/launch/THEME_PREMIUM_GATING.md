# Premium Theme Gating

**Date:** 2026-06-03

## Interface Theme card surface

Each theme defines `selectionCardBackground` in its core palette (e.g. Terracotta Dusk `#ffdbcf`), referenced by `ThemeDefinition.card.background`.

## Access model

| Theme | `access` |
|-------|----------|
| Linen Light | `free` |
| Deep Forest | `premium` |
| Midnight Ivy | `premium` |
| Terracotta Dusk | `premium` |

Canonical source: `access` on each `ThemeDefinition` in `features/theme/definitions/*`.

## Eligibility

Premium themes require **active monthly or annual** subscription (`hasRecurringPremiumSubscription` in `features/theme/themeAccess.ts`).

- Lifetime (`period: "lifetime"`) does **not** unlock premium themes.
- Offline: entitlement cache + `resolveEffectiveTier` (same as billing bootstrap).

## Enforcement layers

1. `canUseTheme` / `applyTheme` — `features/theme/services/themeApplication.ts`
2. `resolveBootstrapAccessibleTheme` — startup hydration (`ThemeBootstrapProvider`)
3. `ThemeEntitlementSync` — downgrade revert + snackbar
4. `InterfaceThemePicker` — UI lock + `/premium` navigation

## Analytics

- `premium_theme_tapped`, `premium_theme_blocked`, `premium_theme_unlocked`, `theme_reverted_after_downgrade`

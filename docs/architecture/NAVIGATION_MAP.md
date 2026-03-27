# Navigation Map

## Purpose

This document explains how navigation is organized across the app so route additions, drill-ins, redirects, and screen responsibilities stay coherent.

## Top-Level Navigation Structure

The app uses Expo Router with four major route groupings:

- root entry and drill-ins in `app/`
- authenticated tabs in `app/(tabs)`
- auth routes in `app/(auth)`
- onboarding routes in `app/onboarding`

The root navigator lives in `app/_layout.tsx`.

## Entry Rules

Entry is governed by:

- authentication state
- onboarding completion state
- safe redirect handling for auth flows

The route system decides whether the user should land in:

- auth
- onboarding
- tabs
- a safe redirect destination after auth

## Major Navigation Zones

### Authenticated Tabs

Primary product zones:

- Garden
- Discovery / Library
- Journal
- Graveyard

These are the habitual return destinations for signed-in users.

### Profile and Settings Drill-Ins

Profile is a root drill-in route rather than a tab screen.

From Profile, users can reach:

- account/security screens
- data and backup screens
- legal screens
- export through the data/backup flow
- collection utility screens such as archive gallery and specimen tags

### Plant Flows

Plant flows live under `/plant` and related detail routes:

- add
- detail
- edit
- activity
- timeline

Related memorial detail and care-log routes sit alongside them.

### Onboarding

Onboarding routes are separate from the main app and should not be treated like settings drill-ins.

### Debug

Debug onboarding routes are dev-only surfaces and should not leak into production user navigation.

## Current Key Route Relationships

### Data & Backup

- Profile row opens `/data-backup`
- `/data-backup` is the editorial overview
- `/data-backup` links to `/backup-details`
- `/data-backup` links to `/export-collection-data`
- export should not be reintroduced as a duplicate Profile row unless product direction changes intentionally

### Legal

Current legal drill-ins:

- `/terms`
- `/privavcy`

### Account Safety

Current account-safety drill-ins:

- `/privacy-security`
- `/change-password`

## Navigation Rules

### Do

- keep one clear path for high-trust workflows such as export
- use drill-in routes for focused settings surfaces
- keep route purpose singular where possible
- register new drill-ins explicitly in the root stack

### Do Not

- create duplicate workflows on multiple routes unless product direction explicitly requires it
- let a diagnostic screen become the main entry screen for a trust-sensitive flow
- bury route meaning in labels that do not match the screen’s real responsibility

## Modal and Special Presentation

Most drill-ins use shared card-style presentation options.

Known exception:

- `/care-log/[id]`
  uses modal-like presentation

If a new modal flow is added, document it here and ensure its navigation behavior is deliberately different from ordinary drill-ins.

## Related Docs

- [SCREEN_INVENTORY.md](../SCREEN_INVENTORY.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

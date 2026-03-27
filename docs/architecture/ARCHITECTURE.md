# Architecture

## Overview

The Conservatory is a production-grade React Native / Expo application organized primarily by feature domains with Expo Router handling app routing and drill-in navigation.

The architecture balances:

- editorial, premium user experience
- local-first behavior
- sync and backup capabilities
- modular feature ownership
- shared design-system consistency

## App Structure

The main top-level route surface lives in `app/`.

Broad route groups:

- `app/(tabs)`
  Primary authenticated tab experience
- `app/(auth)`
  Authentication routes
- `app/onboarding`
  Onboarding flow
- root drill-in routes in `app/`
  Profile/settings, data/backup, legal, export, plant subflows, and modal-style routes

Supporting domain logic lives in `features/`.

Typical feature organization:

- `api/`
- `components/`
- `hooks/`
- `schemas/`
- `services/`
- `stores/`

## Main Architectural Layers

### Routes

Routes in `app/` define user-facing navigation entry points and compose screen-level feature components.

Routes should stay thin where possible:

- screen shell
- route-level navigation wiring
- high-level composition

### Features

Feature folders own business behavior and domain UI.

Examples:

- `features/auth`
- `features/plants`
- `features/profile`
- `features/export`
- `features/onboarding`
- `features/settings`

### Shared System Layers

- `components/`
  Shared UI primitives and system components
- `config/`
  App-wide configuration such as theme integration
- `providers/`
  Cross-cutting providers
- `services/`
  Shared infrastructure such as database and sync
- `styles/`
  tokens and shadow scales

## Navigation Model

Expo Router is the routing system.

Important route behavior:

- `app/_layout.tsx` controls auth gating, onboarding redirects, and stack registration
- authenticated app entry flows into `/(tabs)`
- drill-in screens use shared stack presentation options
- some routes, such as `care-log/[id]`, use modal-like presentation

## UI System

The design system is token-driven.

Primary sources of truth:

- `styles/tokens.ts`
- `config/theme.ts`
- `components/design-system/Theme.tsx`

Shared settings-style drill-ins are composed with:

- `features/profile/components/ProfileScreenScaffold.tsx`

## State and Data Flow

Broadly:

- route composes feature components
- feature hooks fetch and derive state
- api and services talk to local database and backend systems
- shared tokens and theme keep visuals consistent

React Query is used for data fetching, mutation, and invalidation across major feature flows.

## Local-First and Sync

The app uses a local-first data model with sync infrastructure layered on top.

Important implications:

- the local database remains a core product dependency, not just a cache
- sync status and backup messaging must stay truthful
- export is a real data portability surface and should not be duplicated casually

See [SYNC_AND_DATA_MODEL.md](./SYNC_AND_DATA_MODEL.md) for the operational model.

## Design Principle for Architecture

Product surfaces should not own backend truth ad hoc.

Preferred pattern:

- derive backend state in hooks and services
- keep presentation semantics centralized where possible
- let routes focus on composition rather than bespoke logic

## Current Documentation Coverage

This file is intentionally high level.

It should be expanded over time with:

- feature boundary rules
- state ownership guidance
- route naming conventions
- mutation and invalidation patterns
- modal and drill-in patterns

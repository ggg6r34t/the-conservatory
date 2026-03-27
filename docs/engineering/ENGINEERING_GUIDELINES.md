# Engineering Guidelines

## Purpose

This document captures the working conventions for implementing product changes in The Conservatory so code stays consistent, maintainable, and aligned with the app's design system and architecture.

## Core Expectations

- prefer feature-based organization
- keep route files thin when possible
- reuse shared design-system patterns before inventing new UI
- preserve truthfulness in trust-sensitive surfaces
- avoid regressions and duplicate flows

## Project Shape

High-level folders:

- `app/`
  route entry points and screen composition
- `features/`
  domain-specific business logic, hooks, components, schemas, and services
- `components/`
  shared reusable UI primitives and system components
- `services/`
  shared infrastructure such as database and sync
- `styles/`
  tokens and shadows

## Route Guidance

Route files should mainly own:

- navigation composition
- screen-level layout shells
- route-specific orchestration

Move business logic into feature hooks or services when it becomes non-trivial.

## Feature Guidance

When adding or changing feature behavior, prefer this separation:

- `components/`
  rendering and UI composition
- `hooks/`
  derived state, queries, mutations, orchestration
- `api/` or `services/`
  infrastructure and data access
- `schemas/`
  validation and shape enforcement

## UI and Styling Rules

- use `useTheme()` and existing token colors
- avoid ad hoc hex values when a theme token already exists
- use `StyleSheet.create`
- do not introduce inline styles unless there is a compelling reason
- keep typography and spacing aligned with the established app patterns

Design references:

- [DESIGN.md](../design/DESIGN.md)
- [DESIGN_QUICK_REFERENCE.md](../design/DESIGN_QUICK_REFERENCE.md)

## Navigation Rules

- keep one clear route per real workflow
- avoid duplicate entry points unless product direction explicitly wants them
- update [SCREEN_INVENTORY.md](../SCREEN_INVENTORY.md) when routes change
- update [NAVIGATION_MAP.md](../architecture/NAVIGATION_MAP.md) when route responsibilities change

## Data and Sync Rules

- do not overstate backup or sync guarantees in UI
- distinguish backup from export
- keep account-scoped and device-scoped signals semantically honest
- centralize derived trust-state logic in shared hooks or services where possible

Reference:

- [SYNC_AND_DATA_MODEL.md](../architecture/SYNC_AND_DATA_MODEL.md)

## React Query Guidance

- use hooks for queries and mutations
- invalidate the smallest meaningful query set after mutations
- avoid duplicating state derivation across multiple routes when a shared hook can own it

## Testing and Validation

Before considering work complete, verify:

- type safety
- route integrity
- state invalidation after mutations
- loading, success, and error states
- design-system consistency

Common commands:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

## Documentation Hygiene

When changes affect:

- routing
- design system
- trust-sensitive backup/export behavior
- copy or product philosophy

update the corresponding docs in the same change set when practical.

## Do Not

- leave stale product docs after route or system changes
- build one-off visual patterns when an existing family exists
- add duplicate workflows for the same task
- use technical or backend language in user copy when clearer product language is possible

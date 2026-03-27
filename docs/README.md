# Documentation Index

This folder is organized around the core production docs the repo actively keeps up to date.

## Current Structure

### Root
- [SCREEN_INVENTORY.md](./SCREEN_INVENTORY.md)
  Current route and screen inventory for the app.

### Design
- [design/DESIGN.md](./design/DESIGN.md)
  Full implementation-facing design system reference.
- [design/DESIGN_QUICK_REFERENCE.md](./design/DESIGN_QUICK_REFERENCE.md)
  Fast token and UI pattern cheat sheet.

### Architecture
- [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
  High-level application architecture, feature boundaries, and routing model.
- [architecture/SYNC_AND_DATA_MODEL.md](./architecture/SYNC_AND_DATA_MODEL.md)
  Local-first data model, sync behavior, backup/export truthfulness, and queue semantics.
- [architecture/NAVIGATION_MAP.md](./architecture/NAVIGATION_MAP.md)
  Route grouping, user flows, and navigation responsibilities.

### Engineering
- [engineering/ENGINEERING_GUIDELINES.md](./engineering/ENGINEERING_GUIDELINES.md)
  Implementation conventions, code organization, and day-to-day engineering expectations.

## Kept Set

The repo now intentionally keeps this lean 8-file set:

1. `docs/README.md`
2. `docs/SCREEN_INVENTORY.md`
3. `docs/design/DESIGN.md`
4. `docs/design/DESIGN_QUICK_REFERENCE.md`
5. `docs/architecture/ARCHITECTURE.md`
6. `docs/architecture/SYNC_AND_DATA_MODEL.md`
7. `docs/architecture/NAVIGATION_MAP.md`
8. `docs/engineering/ENGINEERING_GUIDELINES.md`

## Maintenance Guidance

- Keep implementation-truth docs aligned with the real codebase.
- Prefer linking to the actual source-of-truth files when documenting tokens, routes, or services.
- Update [SCREEN_INVENTORY.md](./SCREEN_INVENTORY.md) whenever routes are added, removed, or repurposed.
- Update [design/DESIGN.md](./design/DESIGN.md) whenever theme tokens or major UI patterns change.
- Update [architecture/SYNC_AND_DATA_MODEL.md](./architecture/SYNC_AND_DATA_MODEL.md) whenever sync, backup, export, or queue semantics change.

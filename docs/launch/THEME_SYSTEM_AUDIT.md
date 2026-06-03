# Theme System Audit — App-Wide Refinement

**Date:** 2026-06-03

## Phase 1 findings

| Area | Finding | Action |
|------|---------|--------|
| Core tokens | Four themes in `features/theme/definitions/*` | Linen core unchanged; others refined |
| Semantic tokens | Missing — status/sync/domain used MD3 indirectly | Added `BotanicalSemanticTokens` + `deriveSemanticTokens()` |
| Status badges | Mapped to `primary` / `secondaryFixed` / `error` ad hoc | `plantStatusBadgePresentation` uses semantic tokens |
| Tab bar | Hardcoded `rgba(255,255,255,0.96)` | **Left as-is** per product decision |
| Scattered hex in forms/onboarding | `#c6cbc5`, `#fbf9f4`, white borders | Deferred — migrate to `colors.outlineVariant` / `colors.surface` incrementally |
| Midnight Ivy `surfaceVariant` | Was light gray `#e4e2dd` on dark UI | Fixed to `#2a332e` |
| Terracotta `surfaceContainerLow` | Used translucent rgba | Fixed to solid `#efe0d4` |
| Deep Forest surfaces | Flat same green blocks | Layered surface ramp + warm secondary accent |

## Phase 2–3 implementation

- **Linen Light:** Core palette identical; semantics derived (preserves existing UI).
- **Deep Forest:** Woodland ramp, moss tertiary status, warm clay secondary, soft error containers.
- **Midnight Ivy:** Near-black OLED ramp (not pure `#000`), emerald primary, muted `onSurfaceVariant`.
- **Terracotta Dusk:** Clay/sand/cream surfaces, botanical green primary, terracotta secondary (not neon peach).

## Token files

- `features/theme/tokens/coreTokens.ts`
- `features/theme/tokens/semanticTokens.ts`
- `features/theme/tokens/deriveSemanticTokens.ts`
- `features/theme/tokens/buildPalette` via `buildThemePalette()`

## Verification

- `npm run typecheck`
- `tests/features/theme/*.test.ts`
- `tests/features/plants/plant-status-badge-presentation.test.ts`

# Empty State Copy

Empty states in The Conservatory must be truthful, calm, and editorial. Copy lives in `features/empty-states/emptyStateCopyRegistry.ts`.

## Principles

- **Truthful** — Never imply plants, care, hydration, or streaks exist without data.
- **Short** — Title + one body sentence; action label when helpful.
- **Calm** — No urgency, guilt, or fake success.
- **Editorial** — Warm tone without over-poetry when clarity matters.
- **Action-oriented** — One primary CTA when the user can do something next.

## Avoid when data is absent

- "Welcome back" (unless returning-user state is verified)
- "lush", "hydrated", "thriving", "steady rhythm", "comfortably hydrated"
- "your plants" / "your specimens" / "all specimens" when count is zero
- Success-state copy for empty collections

## Taxonomy

| Tone | Use |
|------|-----|
| `firstRun` | No plants ever |
| `neutral` | Feature empty, collection exists |
| `filtered` | Search/filter hides all rows |
| `permission` | Notifications, camera, photos |
| `premium` | Feature locked for free tier |
| `offline` | Remote-only unavailable |
| `insufficientData` | Needs more photos/logs/history |
| `error` | Query or action failed — never masquerade as empty |

## Analytics

- `empty_state_viewed`
- `empty_state_action_tapped`
- `empty_state_filter_cleared`
- `empty_state_retry_tapped`

Properties: `screen`, `empty_state_type`, `reason`, `action` (no plant names or notes).

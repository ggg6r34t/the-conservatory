# Environment Variables and Supabase Secrets

`.env.example` mixes **app (Expo)** variables and **Edge Function** variables. Only the server-side values belong in **Supabase secrets** (Dashboard → Project Settings → Edge Functions → Secrets, or `supabase secrets set`).

Canonical app template: [`.env.example`](../.env.example)  
Edge Functions runbook: [`SUPABASE_EDGE_FUNCTIONS.md`](./SUPABASE_EDGE_FUNCTIONS.md)

---

## Do not put in Supabase secrets

These stay in your local `.env` and/or **EAS secrets** for the mobile app:

| Variable | Where |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | App `.env` / EAS |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App `.env` / EAS |
| `EXPO_PUBLIC_RC_API_KEY_IOS` / `EXPO_PUBLIC_RC_API_KEY_ANDROID` | App `.env` / EAS |
| `EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM` | App `.env` / EAS |
| `EXPO_PUBLIC_RC_OFFERING_IDENTIFIER` | App `.env` / EAS |
| `EXPO_PUBLIC_USE_MOCK_BILLING` | App `.env` / EAS |
| `EXPO_PUBLIC_POSTHOG_*` | App `.env` / EAS |
| `EXPO_PUBLIC_SENTRY_DSN` | App `.env` / EAS |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | App `.env` / EAS (Google native sign-in + Supabase token exchange) |

The anon key is **public by design** in the client. **Never** put the **service role** key in the app.

---

## Set in Supabase secrets (Edge Functions)

From `.env.example` lines 13–27, plus one optional admin secret.

### Required for AI + premium checks

| Secret | Purpose |
|--------|---------|
| `REVENUECAT_SECRET_API_KEY` | Server-side premium verification (from RevenueCat dashboard) |
| `REVENUECAT_PREMIUM_ENTITLEMENT_ID` | Usually `premium` — must match app (`EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM`) |

### AI providers (at least one required)

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | Optional provider |
| `ANTHROPIC_API_KEY` | Optional provider |
| `GOOGLE_AI_API_KEY` | Optional provider (code also accepts `GEMINI_API_KEY`) |

### AI tuning (optional — defaults match `.env.example`)

| Secret | Default |
|--------|---------|
| `AI_PROVIDER_ORDER` | `openai,anthropic,google` |
| `AI_REQUEST_TIMEOUT_MS` | `28000` |
| `AI_MAX_RETRIES` | `2` |
| `AI_CIRCUIT_FAILURE_THRESHOLD` | `5` |
| `AI_CIRCUIT_COOLDOWN_MS` | `60000` |
| `EDGE_AI_MAX_PAYLOAD_BYTES` | `12000` |
| `EDGE_AI_DAILY_LIMIT_FREE` | `10` |
| `EDGE_AI_DAILY_LIMIT_PREMIUM` | `100` |
| `EDGE_AI_MONTHLY_LIMIT_FREE` | `30` |
| `EDGE_AI_MONTHLY_LIMIT_PREMIUM` | `1000` |

### Optional

| Secret | Purpose |
|--------|---------|
| `FEATURE_REQUEST_ADMIN_SECRET` | Admin-only `manage-feature-requests` function |
| `AI_MODEL_OPENAI` / `AI_MODEL_ANTHROPIC` / `AI_MODEL_GOOGLE` | Override default models per provider |

### Usually not manual on hosted Supabase

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **auto-injected** for deployed Edge Functions. You only need to set them for local `supabase functions serve` (see [`SUPABASE_EDGE_FUNCTIONS.md`](./SUPABASE_EDGE_FUNCTIONS.md)).

---

## Example CLI (production)

```bash
supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...
supabase secrets set REVENUECAT_PREMIUM_ENTITLEMENT_ID=premium
supabase secrets set OPENAI_API_KEY=sk-...
# Optional: other providers and limits from .env.example
supabase secrets set EDGE_AI_DAILY_LIMIT_FREE=10
supabase secrets set EDGE_AI_DAILY_LIMIT_PREMIUM=100
```

---

## Sync / Backup Repair only

You do **not** need extra Supabase secrets beyond URL + anon key in the **app**. Sync uses the client with the anon key and RLS. You **do** need migrations applied (`client_id` + constraints), not more secrets.

**Minimum for sync-only work:** the app gets `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Supabase secrets matter when you use AI Edge Functions or server-side RevenueCat checks.

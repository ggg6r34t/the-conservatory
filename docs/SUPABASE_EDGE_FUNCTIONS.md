# Supabase Edge Functions Runbook

## Required Secrets

Set these in Supabase before deploying AI functions:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set REVENUECAT_SECRET_API_KEY=...
supabase secrets set REVENUECAT_PREMIUM_ENTITLEMENT_ID=premium
supabase secrets set EDGE_AI_MAX_PAYLOAD_BYTES=12000
supabase secrets set EDGE_AI_DAILY_LIMIT_FREE=10
supabase secrets set EDGE_AI_DAILY_LIMIT_PREMIUM=100
supabase secrets set EDGE_AI_MONTHLY_LIMIT_FREE=30
supabase secrets set EDGE_AI_MONTHLY_LIMIT_PREMIUM=1000
```

`REVENUECAT_PREMIUM_ENTITLEMENT_ID` must match the RevenueCat entitlement configured for the app. The app currently uses the Supabase user id as the RevenueCat app user id; change the shared entitlement guard if that identity mapping changes.

## Database Migration

Apply the Edge AI usage migration before enabling the functions:

```bash
supabase db push
supabase migration up
```

The migration creates `public.edge_ai_usage` and `public.consume_ai_usage`, which are used by all AI Edge Functions for server-side daily and monthly quota enforcement.

For local verification, run Supabase locally, apply migrations, and confirm the RPC accepts a test user id:

```bash
supabase start
supabase migration up
```

## Deploy

Deploy all AI functions after the migration and secrets are present:

```bash
supabase functions deploy generate-dashboard-insight
supabase functions deploy generate-journal-summary
supabase functions deploy generate-health-insight
supabase functions deploy identify-plant
supabase functions deploy refine-care-log
supabase functions deploy generate-streak-nudge
supabase functions deploy optimize-reminders
supabase functions deploy curate-archive-gallery
supabase functions deploy delete-account
```

## Operational Notes

- All AI functions require a Supabase authenticated JWT.
- Premium-only functions also verify RevenueCat server-side.
- AI functions reject oversized payloads before parsing.
- Logs are structured and redact notes, prompts, names, photo URIs, and URLs.
- Client fallbacks remain authoritative when a function returns validation, quota, entitlement, or network errors.
- Free health insight and plant identification remain quota-limited server-side.
- Premium AI remains rate-limited server-side to control runaway cost.

## Verification

Run before release:

```bash
npm test -- --testPathPatterns=tests/supabase --runInBand
npx tsc --noEmit
npx expo lint
```

For local Edge smoke checks, serve functions and call them with an authenticated user JWT:

```bash
supabase functions serve
curl -i \
  -H "Authorization: Bearer $SUPABASE_USER_JWT" \
  -H "Content-Type: application/json" \
  --data '{"imageUri":"monstera.jpg"}' \
  http://127.0.0.1:54321/functions/v1/identify-plant
```

Expected denial codes to verify before release:

- `premium_required` for premium-only functions called by a free user.
- `quota_exceeded` when the monthly RPC quota is exhausted.
- `rate_limit_exceeded` when the daily RPC quota is exhausted.
- `auth_required` when `Authorization: Bearer` is missing or invalid.

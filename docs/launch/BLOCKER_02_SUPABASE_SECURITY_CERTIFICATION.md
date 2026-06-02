# Blocker 02 — Supabase Security Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

This certification covers schema + RLS presence in versioned migrations, storage isolation, AI telemetry lockdown, quota table isolation, and account-deletion storage purge.

Production deployment must still run `supabase db push` (or equivalent) against the live project and validate policies with a staging JWT.

## Remediation Summary

| Area | Action | Evidence |
|------|--------|----------|
| Baseline schema + RLS | Promoted `database/schema.sql` into `supabase/migrations/20260401000000_baseline_conservatory_schema_rls.sql` with idempotent policy drops | Migration file |
| Feature usage sync | Added `public.feature_usage` with per-user RLS | `20260602150000_security_hardening.sql` |
| AI telemetry | `edge_ai_usage` RLS + revoke client table access; `consume_ai_usage` / `record_edge_ai_request` granted to `service_role` only | `20260602150000_security_hardening.sql` |
| AI request log | Users may SELECT own rows only; no client INSERT | `20260602140000_edge_ai_observability.sql` + hardening |
| Storage | Private `photos` bucket; folder policies scoped to `auth.uid()` | Baseline migration |
| Account deletion | Purge `photos/{userId}/**` before `auth.admin.deleteUser` | `accountDeletion.ts`, `delete-account/index.ts` |
| Feature requests | RLS from `20260602120000_feature_requests.sql` (unchanged, verified in tests) | Migration file |

## Tenant Isolation Model

All collection tables use `auth.uid() = user_id` (or `user_id` PK for preferences) with optional `public.is_admin()` override.

## Tables Without User JWT Access

| Table | Access |
|-------|--------|
| `edge_ai_usage` | Service role only (edge `consume_ai_usage` RPC) |
| `edge_ai_request_log` | INSERT via service role; SELECT own row for authenticated |

## Storage Buckets

| Bucket | Public | Policy |
|--------|--------|--------|
| `photos` | false | Read/write/update/delete only under `{auth.uid()}/...` |

Exports are client-side JSON (no `exports` bucket in code). Backups use the same `photos` bucket for plant and feedback assets.

## Edge Functions (authorization)

| Function | Auth | Notes |
|----------|------|-------|
| AI functions | JWT + `createEdgeContext` | Premium gates via RevenueCat where required |
| `delete-account` | JWT | Storage purge + auth user delete |
| `manage-feature-requests` | Admin secret header | Not end-user JWT |

## Verification Commands

```bash
npm test -- --testPathPattern=tests/supabase --runInBand
npm run typecheck
```

## Results

| Check | Result |
|-------|--------|
| `tests/supabase/supabase-security-certification.test.ts` | **PASS** |
| `tests/supabase/edge-functions-production-hardening.test.ts` | **PASS** |
| Full suite | **529** tests — **PASS** |

## Deployment Checklist

1. Apply migrations in order under `supabase/migrations/`.
2. Confirm `photos` bucket remains private (`public = false`).
3. Smoke-test with two user JWTs: user A cannot read user B plants/photos rows.
4. Call `delete-account` and verify storage prefix for the user is empty.

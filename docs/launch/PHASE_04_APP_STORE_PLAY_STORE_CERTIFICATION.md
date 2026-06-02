# Phase 04 — App Store / Play Store Readiness Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Subscription paywall compliance, in-app legal policies, account deletion, and export portability required for Apple App Store and Google Play submission.

## Remediation Summary

| Area | Requirement | Evidence |
|------|-------------|----------|
| Subscription screens | Pricing, restore, renewal/cancel disclosures | `app/premium.tsx`, `app/subscription-plans.tsx` |
| Purchase funnel honesty | Monetization events on plan screen | `purchase_started`, `purchase_completed`, `restore_completed` in `subscription-plans.tsx` |
| Terms of Service | Billing, restore, no placeholder copy | `features/legal/content/termsOfService.ts`, `app/terms.tsx` |
| Privacy Policy | GDPR subprocessors, export, deletion | `features/legal/content/privacyPolicy.ts`, `app/privacy.tsx` |
| AI disclosure | Provider names, not professional advice | `app/ai-disclosure.tsx` |
| Satellite policies | Subscription terms, account deletion, data export | `app/subscription-terms.tsx`, `app/account-deletion-policy.tsx`, `app/data-export-policy.tsx` |
| Action hub | Export + delete account wired | `app/privacy-security.tsx` |
| Signup acknowledgment | Legal links before account creation | `SignupLegalAcknowledgment.tsx` |
| Route registration | All policy routes in stack | `app/_layout.tsx` |
| Account deletion | Edge function + local purge | `supabase/functions/delete-account`, Blocker 02 cert |

Detailed legal audit: [`docs/compliance/LEGAL_COMPLIANCE_AUDIT_REPORT.md`](../compliance/LEGAL_COMPLIANCE_AUDIT_REPORT.md).

## Verification Commands

```bash
npm test -- --testPathPattern="legal-policy-screens|premium-screen-disclosure" --runInBand
npm run typecheck
```

## Results

| Check | Result |
|-------|--------|
| `tests/features/legal/legal-policy-screens.test.tsx` | **PASS** (3 tests) |
| `tests/features/billing/premium-screen-disclosure.test.tsx` | **PASS** (2 tests) |
| `npm run typecheck` | **PASS** |
| Full suite (post Phase 03) | **577** tests — **PASS** |

## Conditional Items (outside repo)

1. External counsel review before store submission.
2. Host policy parity at `theconservatory.app/terms` and `/privacy`.
3. EU/UK analytics consent UI if PostHog is enabled without prior consent (see privacy policy disclosure).

## Manual Smoke Checklist

1. Profile → Privacy & Security → Terms, Privacy, AI Disclosure open with full content.
2. Premium → View Subscription Plans → renewal/cancel copy visible; Restore Purchases present.
3. Privacy & Security → Export collection data and Delete account flows reachable.

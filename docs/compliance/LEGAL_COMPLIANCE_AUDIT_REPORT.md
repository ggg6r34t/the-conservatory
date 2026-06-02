# Legal Compliance Audit Report

**Product:** The Conservatory  
**Audit date:** June 2, 2026  
**Scope:** Mobile app (Expo/React Native), Supabase, RevenueCat, local-first SQLite

## Executive Summary

Legal surfaces were audited against real code paths, all in-app legal documents were rewritten to reflect actual behavior, six new policy routes were added, and paywall, signup, deletion, and subscription disclosures were remediated.

**Launch readiness:** **CONDITIONAL PASS** — in-app implementation is production-ready pending external counsel review and website policy parity at `theconservatory.app`.

## Verification Summary (Phase 8)

| Requirement | Result | Evidence |
|---|---|---|
| No placeholder legal text | PASS | `tests/features/legal/legal-policy-screens.test.tsx` |
| Terms of Service | PASS | `features/legal/content/termsOfService.ts` |
| Privacy Policy (GDPR/subprocessors) | PASS | `features/legal/content/privacyPolicy.ts` |
| Subscription disclosures | PASS | `app/subscription-plans.tsx`, `subscriptionTerms.ts` |
| AI disclosure | PASS | `app/ai-disclosure.tsx` |
| Export portability | PASS | `privacy-security.tsx` → `/export-collection-data` |
| Account deletion | PASS | `authClient.deleteAccount`, `accountDeletionPolicy.ts` |
| All routes registered | PASS | `app/_layout.tsx` |
| Signup legal acknowledgment | PASS | `SignupLegalAcknowledgment.tsx` |
| Paywall 24-hour cancel text | PASS | `premium-screen-disclosure.test.tsx` |

## Outstanding Risks

1. External counsel review recommended before store submission.
2. Mirror in-app policies on `theconservatory.app/terms` and `/privacy`.
3. EU/UK PostHog analytics may need explicit consent UI.
4. Supabase Storage objects may persist briefly after account deletion (disclosed).
5. Auto-generated OSS NOTICE file not yet produced from lockfile.

## Code Locations

- Legal content (modular sections): `features/legal/content/`
- **Four primary screens:** `/terms`, `/privacy`, `/ai-disclosure`, `/license`
- **Action hub:** `/privacy-security` (export + delete account)
- Consolidated satellite policies redirect to `/terms` or `/privacy`
- Navigation: `app/profile.tsx`, `app/privacy-security.tsx`

**Tests:** `npm test -- --runInBand --testPathPattern="legal-policy-screens|premium-screen-disclosure"`

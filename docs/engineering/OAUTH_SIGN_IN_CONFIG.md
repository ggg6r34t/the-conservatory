# OAuth Sign-In — Supabase and Platform Configuration

This document covers Apple Sign In and Google Sign In for The Conservatory mobile app.

Related code:

- Redirect helper: `features/auth/constants/authRedirects.ts` → `getOAuthRedirectUri()`
- OAuth services: `features/auth/services/`
- Callback route: `app/auth/callback.tsx`
- Callback bridge: `features/auth/components/OAuthCallbackBridge.tsx`

---

## Redirect URLs (register in Supabase Auth)

Add these to **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**:

| Environment | URL |
|-------------|-----|
| Native dev / prod | `theconservatory://auth/callback` |
| Universal link / web | `https://theconservatory.garden/auth/callback` |

Password recovery URLs remain separate (`/auth/reset-password`).

---

## Apple provider (Supabase)

1. Enable **Apple** under Authentication → Providers.
2. Configure Services ID / Bundle ID: `com.northfold.theconservatory`
3. Add Apple secret (JWT) in Supabase provider settings.
4. Ensure redirect URLs above are allowlisted.

**App Store compliance:** Apple Sign In is shown on iOS whenever Google Sign In is available.

**Notes:**

- Private relay emails (`@privaterelay.appleid.com`) are supported.
- Full name may only be present on first authorization; profile hydration preserves customized display names.

---

## Google provider (Supabase + native)

### Supabase

1. Enable **Google** under Authentication → Providers.
2. Configure OAuth client IDs in Supabase (web client required for token exchange).

### Mobile app env

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID used by `@react-native-google-signin/google-signin` and Supabase `signInWithIdToken` |

Set in local `.env` and EAS secrets for release builds.

### Google Cloud Console

Create OAuth clients as needed:

| Client | Used for |
|--------|----------|
| Web client | Supabase provider + native Google Sign-In `webClientId` |
| iOS client | Optional; bundle `com.northfold.theconservatory` |
| Android client | Package `com.northfold.theconservatory` + SHA-1/SHA-256 fingerprints |

Register redirect URIs in Google Cloud and Supabase:

- `https://<project-ref>.supabase.co/auth/v1/callback`
- `theconservatory://auth/callback` (if required by your Google client type)

### Android release builds

Add Play App Signing SHA-1 and SHA-256 fingerprints to the Android OAuth client.

Rebuild the dev client after adding `@react-native-google-signin/google-signin` (native module).

When the native module is unavailable (e.g. Expo Go), Google falls back to browser OAuth via Supabase.

Callback deduplication is handled in `features/auth/services/oauthCallbackCoordinator.ts`; profile hydration deduplication in `oauthProfileCoordinator.ts`.

Production builds without `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are blocked by `ReleaseConfigGate` via `collectReleaseValidationIssues()`.

---

## App config

`app.config.js` includes:

- `scheme: theconservatory`
- Android intent filters for `/auth/callback`
- iOS associated domain: `applinks:theconservatory.garden`
- Plugins: `expo-web-browser`, `@react-native-google-signin/google-signin`

---

## Analytics (safe properties only)

OAuth events:

- `oauth_sign_in_started`
- `oauth_sign_in_cancelled`
- `oauth_sign_in_failed`
- `oauth_sign_in_succeeded`
- `oauth_callback_received`
- `oauth_profile_ensured`

Properties: `provider`, `screen`, `reason_code` — never email, tokens, or raw callback params.

---

## Manual QA checklist

### iOS

- [ ] Apple sign-in (new + returning)
- [ ] Google sign-in (new + returning)
- [ ] Cancellation shows calm copy, no session
- [ ] Private relay email account works
- [ ] Reinstall restores session when expected

### Android

- [ ] Google sign-in (new + returning)
- [ ] Cancellation
- [ ] Reinstall / session restore

### Builds

- [ ] Expo dev client redirect (`theconservatory://auth/callback`)
- [ ] EAS internal build redirect
- [ ] Email/password, reset password, sign-out regressions

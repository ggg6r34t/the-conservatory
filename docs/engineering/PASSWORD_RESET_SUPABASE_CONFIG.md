# Supabase Password Reset Configuration

Use this checklist when configuring hosted Supabase Auth for The Conservatory mobile app.

## Redirect URLs (required)

Add every URL below to **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard:

| URL | Purpose |
|-----|---------|
| `theconservatory://auth/reset-password` | Native deep link (iOS / Android) |
| `https://theconservatory.app/auth/reset-password` | Email redirect + universal / app links |
| `http://127.0.0.1:3000/auth/reset-password` | Local web fallback (optional dev) |

The mobile app calls `resetPasswordForEmail` with `redirectTo: https://theconservatory.app/auth/reset-password` (see `features/auth/constants/authRedirects.ts`).

## Site URL

Set **Site URL** to your primary web origin, for example:

- Production: `https://theconservatory.app`
- Local Supabase: `http://127.0.0.1:3000` (see `supabase/config.toml`)

## Email template

Customize **Authentication → Email Templates → Reset password** if needed. The link must use the configured `redirectTo` and must not be rewritten to strip hash or query parameters.

Recommended tone: calm, neutral, no account-existence hints.

## Sender / SMTP

For production:

1. Configure a verified sender domain (e.g. `theconservatory.app`).
2. Set custom SMTP under **Project Settings → Auth** if not using Supabase default mail.
3. Confirm deliverability (SPF, DKIM, DMARC) with your DNS provider.

## Rate limiting

Supabase enforces email rate limits. The app maps rate-limit errors to a neutral message and analytics reason `rate_limited` without revealing whether an email exists.

## Mobile deep linking

### iOS

- App scheme: `theconservatory` (`app.config.js`)
- Associated domains: `applinks:theconservatory.app`, `applinks:theconservatory.garden`
- Host `/.well-known/apple-app-site-association` on both domains (served by `the-conservatory-web` when `APPLE_TEAM_ID` is set)

### Android

- App Links intent filters for `https://theconservatory.app/auth/reset-password` and `https://theconservatory.garden/auth/reset-password`
- Custom scheme intent filter for `theconservatory://auth/reset-password`
- Host `/.well-known/assetlinks.json` (served by `the-conservatory-web` when `ANDROID_APP_LINK_SHA256_FINGERPRINTS` is set)

### Web env vars (`the-conservatory-web`)

| Variable | Purpose |
|----------|---------|
| `APPLE_TEAM_ID` | Apple Developer Team ID for AASA `appID` |
| `ANDROID_APP_LINK_SHA256_FINGERPRINTS` | Comma-separated SHA-256 cert fingerprints for Play App Links |

## Web fallback

`the-conservatory-web` serves `/auth/reset-password`, which attempts to open the app deep link and shows support contact if the app is not installed.

Deploy this route on **both** `theconservatory.app` and `theconservatory.garden` if both domains are live.

## Post-reset session behavior

After a successful password update from a recovery link, the app:

1. Calls `supabase.auth.updateUser({ password })`
2. Signs out the recovery session
3. Clears local app session
4. Navigates to sign-in with a success confirmation

Users sign in again with the new password intentionally.

## Manual QA checklist

### iOS simulator / device

- [ ] Tap **Forgot password?** on sign-in
- [ ] Submit a registered email; confirm neutral success copy (no account-existence hint)
- [ ] Receive reset email; tap link on the same device
- [ ] App opens to **Create a new password**
- [ ] Set a valid new password; confirm success dialog and return to sign-in
- [ ] Sign in with the new password

### Android emulator / device

- [ ] Repeat the iOS flow above

### Expired / invalid link

- [ ] Open an expired or tampered link; confirm friendly error and **Request new link** path

### App not installed

- [ ] Open reset link in desktop browser; confirm web fallback at `/auth/reset-password` with **Open The Conservatory** and support email

### Offline

- [ ] Submit forgot-password while offline; confirm network error via custom alert (no email enumeration)

## Security notes

- Reset tokens are never stored in SQLite, AsyncStorage, or analytics.
- Email existence is never revealed on the forgot-password screen.
- Only a boolean recovery-pending flag is stored in SecureStore (no tokens).

# Screen Inventory

This file lists the app's current screens so we can review their UI/UX one by one.

## Primary App Screens

1. `/(tabs)` - Garden
   File: `app/(tabs)/index.tsx`

2. `/(tabs)/library` - Discovery / Living Gallery
   File: `app/(tabs)/library.tsx`

3. `/(tabs)/journal` - Journal / Growth Timeline
   File: `app/(tabs)/journal.tsx`

4. `/(tabs)/graveyard` - Graveyard / Memorial Garden
   File: `app/(tabs)/graveyard.tsx`

5. `/profile` - Profile / Account & Preferences
   File: `app/profile.tsx`

## Auth Screens

6. `/(auth)/login` - Login
   File: `app/(auth)/login.tsx`

7. `/(auth)/signup` - Sign Up
   File: `app/(auth)/signup.tsx`

8. `/(auth)/forgot-password` - Forgot Password
   File: `app/(auth)/forgot-password.tsx`

## Plant Screens

9. `/plant/add` - Add Plant / New Specimen
   File: `app/plant/add.tsx`

10. `/plant/[id]` - Plant Detail
    File: `app/plant/[id].tsx`

11. `/plant/[id]/edit` - Edit Plant
    File: `app/plant/[id]/edit.tsx`

## Care Flow Screens

12. `/care-log/[id]` - Log Care Modal
    File: `app/care-log/[id].tsx`

## Non-Screen Route Files

These are route infrastructure files rather than user-facing screens:

- `app/_layout.tsx`
- `app/index.tsx`
- `app/(auth)/_layout.tsx`
- `app/(tabs)/_layout.tsx`

## Suggested UI/UX Review Order

1. Garden
2. Discovery / Library
3. Journal
4. Graveyard
5. Profile
6. Plant Detail
7. Add Plant
8. Edit Plant
9. Care Log Modal
10. Login
11. Sign Up
12. Forgot Password

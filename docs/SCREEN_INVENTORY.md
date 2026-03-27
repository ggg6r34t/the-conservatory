# Screen Inventory

This file tracks the app's current route screens and route-adjacent files so product, design, and engineering can review the UI/UX surface accurately.

## Notes

- Route names are listed exactly as they exist in `app/`.
- User-facing labels sometimes differ from route names.
- `app/privavcy.tsx` is intentionally listed with its current route spelling because that is the real file and route in the codebase.

## App Entry and Root Routes

1. `/`
   Screen: App entry / redirect gateway
   File: `app/index.tsx`
   Notes: Decides where the user lands based on auth and onboarding state.

2. `/profile`
   Screen: Profile
   File: `app/profile.tsx`
   Notes: Main account hub with collection, subscription, preference, account, and legal entry points.

## Primary Tab Screens

3. `/(tabs)/index`
   Screen: Garden
   File: `app/(tabs)/index.tsx`
   Notes: Primary dashboard / home screen.

4. `/(tabs)/library`
   Screen: Discovery / Library
   File: `app/(tabs)/library.tsx`
   Notes: Plant discovery and browsing surface.

5. `/(tabs)/journal`
   Screen: Journal
   File: `app/(tabs)/journal.tsx`
   Notes: Journal timeline and monthly highlight surface.

6. `/(tabs)/graveyard`
   Screen: Graveyard
   File: `app/(tabs)/graveyard.tsx`
   Notes: Memorial garden / archived plants surface.

## Auth Screens

7. `/(auth)/login`
   Screen: Login
   File: `app/(auth)/login.tsx`

8. `/(auth)/signup`
   Screen: Sign Up
   File: `app/(auth)/signup.tsx`

9. `/(auth)/forgot-password`
   Screen: Forgot Password
   File: `app/(auth)/forgot-password.tsx`

## Onboarding Screens

10. `/onboarding/walkthrough`
    Screen: Onboarding Walkthrough
    File: `app/onboarding/walkthrough.tsx`

11. `/onboarding/gallery`
    Screen: Onboarding Gallery
    File: `app/onboarding/gallery.tsx`

12. `/onboarding/care-rhythm`
    Screen: Onboarding Care Rhythm
    File: `app/onboarding/care-rhythm.tsx`

13. `/onboarding/graveyard`
    Screen: Onboarding Graveyard
    File: `app/onboarding/graveyard.tsx`

14. `/onboarding/permissions`
    Screen: Onboarding Permissions
    File: `app/onboarding/permissions.tsx`

15. `/onboarding/quick-start`
    Screen: Onboarding Quick Start
    File: `app/onboarding/quick-start.tsx`

## Profile / Settings Drill-In Screens

16. `/profile-edit`
    Screen: Edit Profile
    File: `app/profile-edit.tsx`

17. `/change-password`
    Screen: Change Password
    File: `app/change-password.tsx`

18. `/privacy-security`
    Screen: Privacy & Security
    File: `app/privacy-security.tsx`

19. `/data-backup`
    Screen: Data & Backup
    File: `app/data-backup.tsx`
    Notes: Editorial overview for sync, backup, and export entry.

20. `/backup-details`
    Screen: Backup Details
    File: `app/backup-details.tsx`
    Notes: Diagnostic sync / backup status surface.

21. `/export-collection-data`
    Screen: Export Collection Data
    File: `app/export-collection-data.tsx`
    Notes: Dedicated export workflow.

22. `/care-reminders`
    Screen: Care Reminders
    File: `app/care-reminders.tsx`

23. `/interface-theme`
    Screen: Interface Theme
    File: `app/interface-theme.tsx`

24. `/highlights`
    Screen: Highlights
    File: `app/highlights.tsx`

25. `/terms`
    Screen: Terms of Service
    File: `app/terms.tsx`

26. `/privavcy`
    Screen: Privacy Policy
    File: `app/privavcy.tsx`
    Notes: Route/file name currently uses `privavcy`.

## Collection and Utility Screens

27. `/archive-gallery`
    Screen: Archive Gallery
    File: `app/archive-gallery.tsx`

28. `/specimen-tags`
    Screen: Specimen Tags
    File: `app/specimen-tags.tsx`

## Plant and Memorial Screens

29. `/plant/add`
    Screen: Add Plant / New Specimen
    File: `app/plant/add.tsx`

30. `/plant/[id]`
    Screen: Plant Detail
    File: `app/plant/[id].tsx`

31. `/plant/[id]/edit`
    Screen: Edit Plant
    File: `app/plant/[id]/edit.tsx`

32. `/plant/[id]/timeline`
    Screen: Plant Timeline
    File: `app/plant/[id]/timeline.tsx`

33. `/plant/[id]/activity`
    Screen: Plant Activity
    File: `app/plant/[id]/activity.tsx`

34. `/memorial/[id]`
    Screen: Memorial Detail
    File: `app/memorial/[id].tsx`

## Care Logging Screen

35. `/care-log/[id]`
    Screen: Care Log Modal
    File: `app/care-log/[id].tsx`
    Notes: Presented as a modal-style logging surface.

## Debug / Internal Screens

36. `/debug/onboarding`
    Screen: Onboarding Debug Hub
    File: `app/debug/onboarding.tsx`

37. `/debug/onboarding-welcome`
    Screen: Onboarding Debug Welcome
    File: `app/debug/onboarding-welcome.tsx`

38. `/debug/onboarding-walkthrough`
    Screen: Onboarding Debug Walkthrough
    File: `app/debug/onboarding-walkthrough.tsx`

39. `/debug/onboarding-permissions`
    Screen: Onboarding Debug Permissions
    File: `app/debug/onboarding-permissions.tsx`

40. `/debug/onboarding-quick-start`
    Screen: Onboarding Debug Quick Start
    File: `app/debug/onboarding-quick-start.tsx`

## Route Infrastructure Files

These files shape routing and navigation but are not standalone user-facing screens:

- `app/_layout.tsx`
- `app/(auth)/_layout.tsx`
- `app/(tabs)/_layout.tsx`

## Suggested Review Order

If reviewing the product surface end to end, this order is the most practical:

1. Garden
2. Discovery / Library
3. Journal
4. Graveyard
5. Profile
6. Data & Backup
7. Backup Details
8. Export Collection Data
9. Change Password
10. Privacy & Security
11. Care Reminders
12. Interface Theme
13. Highlights
14. Archive Gallery
15. Specimen Tags
16. Plant Detail
17. Plant Activity
18. Plant Timeline
19. Add Plant
20. Edit Plant
21. Memorial Detail
22. Care Log Modal
23. Terms of Service
24. Privacy Policy
25. Login
26. Sign Up
27. Forgot Password
28. Onboarding flow
29. Debug screens

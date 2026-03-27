# Design Quick Reference

This is the day-to-day implementation companion to [DESIGN.md](./DESIGN.md).

Use this file when you need the live token values, common UI patterns, and practical do/don't guidance without reading the full strategy document.

## Core Principle

The app should feel:
- calm
- editorial
- warm
- premium
- botanical, not generic

Default to:
- tonal layering over borders
- serif for editorial emphasis
- sans-serif for utility
- soft rounded surfaces
- restrained accent color usage

## Theme Source of Truth

- Tokens: `styles/tokens.ts`
- Paper theme: `config/theme.ts`
- Theme provider: `components/design-system/Theme.tsx`

## Color Tokens

### Primary
- `primary`: `#163828`
- `primaryContainer`: `#2d4f3e`
- `primaryFixed`: `#c5ebd4`
- `primaryFixedDim`: `#a9cfb9`
- `onPrimary`: `#ffffff`
- `onPrimaryContainer`: `#9ac0aa`

### Secondary
- `secondary`: `#94492e`
- `secondaryContainer`: `#fd9e7c`
- `secondaryFixed`: `#ffdbcf`
- `secondaryFixedDim`: `#ffb59c`
- `onSecondary`: `#ffffff`
- `onSecondaryContainer`: `#77331a`

### Tertiary
- `tertiary`: `#2a3521`
- `tertiaryContainer`: `#404c36`
- `tertiaryFixed`: `#dae7c9`
- `tertiaryFixedDim`: `#becbae`
- `onTertiary`: `#ffffff`

### Surfaces
- `background`: `#fbf9f4`
- `surface`: `#fbf9f4`
- `surfaceBright`: `#fbf9f4`
- `surfaceDim`: `#dbdad5`
- `surfaceVariant`: `#e4e2dd`
- `surfaceContainer`: `#f0eee9`
- `surfaceContainerLow`: `#f5f3ee`
- `surfaceContainerLowest`: `#ffffff`
- `surfaceContainerHigh`: `#eae8e3`
- `surfaceContainerHighest`: `#e4e2dd`
- `surfaceTint`: `#436653`

### Text and Utility
- `onBackground`: `#1b1c19`
- `onSurface`: `#1b1c19`
- `onSurfaceVariant`: `#414844`
- `outline`: `#727973`
- `outlineVariant`: `#c1c8c2`
- `backdrop`: `rgba(27, 28, 25, 0.32)`

### Error
- `error`: `#ba1a1a`
- `errorContainer`: `#ffdad6`
- `onError`: `#ffffff`
- `onErrorContainer`: `#93000a`

## Spacing Tokens

- `xs`: `6`
- `sm`: `10`
- `md`: `16`
- `lg`: `24`
- `xl`: `32`
- `xxl`: `40`
- `section`: `48`

Quick guidance:
- inside compact cards/forms: `md`, `lg`
- between stacked sections: `xl`, `xxl`
- major editorial breaks: `section`

## Radius Tokens

- `sm`: `14`
- `md`: `20`
- `lg`: `28`
- `pill`: `999`

Quick guidance:
- inputs/trays: `sm`
- cards: `md` to `lg`
- chips/buttons/toggles: `pill`

## Typography Tokens

### Serif
- `display`: `NotoSerif_700Bold`, `56/62`
- `headline`: `NotoSerif_700Bold`, `34/40`
- `title`: `NotoSerif_700Bold`, `26/32`

### Sans
- `body`: `Manrope_500Medium`, `16/24`
- `label`: `Manrope_700Bold`, `12/16`, `letterSpacing: 2`

Quick guidance:
- use `Noto Serif` for titles, plant names, editorial emphasis
- use `Manrope` for body, controls, metadata, labels, buttons

## Common UI Patterns

### Screen background
- usually `surface`

### Card layering
- parent section: `surface` or `surfaceContainerLow`
- interactive card: `surfaceContainerLowest`
- utility/inset tray: `surfaceContainerHigh`

### Primary button
- background: `primary` or `primary -> primaryContainer`
- text: `onPrimary`
- shape: pill or highly rounded

### Secondary button / warm CTA
- background: `secondaryContainer`
- text/icon: `onSecondaryContainer`

### Inputs
- background: `surfaceContainerLow`
- label above field in `Manrope`
- avoid harsh outlines

### Chips
- inactive chip: `surfaceContainerHigh`
- active chip: `tertiaryContainer`
- informational chip: often `secondaryContainer` or `primaryFixed`

### Icon tiles
- neutral tile: `surfaceContainerHigh`
- green highlight: `primaryFixed`
- warm highlight: `secondaryContainer`
- soft botanical utility: `tertiaryFixed`

## Settings Screen Pattern

Shared settings shell:
- `features/profile/components/ProfileScreenScaffold.tsx`

Common pattern:
- top bar title: `Settings`
- eyebrow: `Manrope_700Bold`, `12/16`
- hero title: large `Noto Serif`
- description: `Manrope_500Medium`, typically `16/28`
- body rhythm: `gap: 20`

Use this family for:
- profile drill-ins
- legal screens
- export
- data/backup
- account/security screens

## Do

- use existing tokens before inventing values
- prefer `useTheme()` colors over inline hex values
- create hierarchy with spacing and surface contrast
- keep screens soft and breathable
- let photography lead when relevant

## Don't

- use pure black text
- add heavy divider lines everywhere
- introduce sharp corners
- make settings surfaces look like admin dashboards
- invent one-off colors when a token already exists

## Fast Implementation Checklist

Before shipping a new screen or refinement, check:

- Does it use token colors instead of ad hoc hex values?
- Does the spacing follow the existing rhythm?
- Does typography stay within the established serif/sans roles?
- Does the surface hierarchy use tonal layering instead of hard borders?
- Does it feel like part of the same app family as Profile, Data & Backup, and Plant screens?

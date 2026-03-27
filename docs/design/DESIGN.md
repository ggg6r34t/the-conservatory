# Design System Strategy: The Botanical Editorial

## 1. Overview & Creative North Star

The creative north star for this system is **The Digital Conservatory**.

The app should feel like an editorial botanical journal rather than a generic utility dashboard. Modern plant care sits at the intersection of science, ritual, photography, and memory. The design system therefore favors:

- premium editorial pacing over dense dashboards
- high-quality photography as the protagonist
- warm tonal layering instead of hard chrome
- serif-led storytelling paired with sans-serif utility
- restrained, organic surfaces over sharp technical UI

The result should feel like a well-produced independent botany magazine translated into a mobile product.

## 1.1 Brand Philosophy

The Conservatory should feel:

- calm, never frantic
- premium, never flashy
- warm, never sugary
- intelligent, never cold
- archival, not disposable

The product is not just a plant tracker. It is a living archive of care, memory, and observation.

That means the interface should:

- reduce noise instead of increasing urgency
- treat photography as part of the product language, not decoration
- feel composed and trustworthy in high-trust surfaces like backup, export, privacy, and account flows
- balance editorial beauty with practical clarity

If a screen is technically correct but feels generic, loud, or overly mechanical, it is not fully aligned with the system.

---

## 2. Core Tokens

The source of truth for design tokens is `styles/tokens.ts`.

### Color Tokens

#### Primary greens
- `primary`: `#163828`
- `primaryContainer`: `#2d4f3e`
- `primaryFixed`: `#c5ebd4`
- `primaryFixedDim`: `#a9cfb9`
- `onPrimary`: `#ffffff`
- `onPrimaryContainer`: `#9ac0aa`
- `onPrimaryFixed`: `#002113`
- `onPrimaryFixedVariant`: `#2c4e3d`

#### Secondary terracotta
- `secondary`: `#94492e`
- `secondaryContainer`: `#fd9e7c`
- `secondaryOnContainer`: `#77331a`
- `secondaryFixed`: `#ffdbcf`
- `secondaryFixedDim`: `#ffb59c`
- `onSecondary`: `#ffffff`
- `onSecondaryContainer`: `#77331a`
- `onSecondaryFixed`: `#390c00`
- `onSecondaryFixedVariant`: `#763219`

Note: the codebase uses `onSecondaryContainer` as the theme-access token. `secondaryOnContainer` exists in `tokens` but should be treated as a legacy duplicate, not the preferred API.

#### Tertiary botanical neutrals
- `tertiary`: `#2a3521`
- `tertiaryContainer`: `#404c36`
- `tertiaryFixed`: `#dae7c9`
- `tertiaryFixedDim`: `#becbae`
- `onTertiary`: `#ffffff`
- `onTertiaryContainer`: `#afbca0`
- `onTertiaryFixed`: `#141e0c`
- `onTertiaryFixedVariant`: `#3f4a35`

#### Background and surfaces
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

#### Text and utility
- `onBackground`: `#1b1c19`
- `onSurface`: `#1b1c19`
- `onSurfaceVariant`: `#414844`
- `inverseSurface`: `#30312e`
- `inverseOnSurface`: `#f2f1ec`
- `inversePrimary`: `#a9cfb9`
- `outline`: `#727973`
- `outlineVariant`: `#c1c8c2`
- `backdrop`: `rgba(27, 28, 25, 0.32)`
- `transparent`: `transparent`

#### Error
- `error`: `#ba1a1a`
- `errorContainer`: `#ffdad6`
- `onError`: `#ffffff`
- `onErrorContainer`: `#93000a`

### Spacing Tokens

- `xs`: `6`
- `sm`: `10`
- `md`: `16`
- `lg`: `24`
- `xl`: `32`
- `xxl`: `40`
- `section`: `48`

Guidance:
- Use `md` and `lg` most often inside cards and forms.
- Use `xl`, `xxl`, and `section` between major editorial blocks.
- Keep denser operational screens tighter, but stay inside the token rhythm.

### Radius Tokens

- `sm`: `14`
- `md`: `20`
- `lg`: `28`
- `pill`: `999`

Guidance:
- Inputs and compact trays tend to sit around `sm`.
- most cards and grouped surfaces use `md` or `lg`
- chips, toggles, and full-pill buttons use `pill`

### Typography Tokens

#### Serif hierarchy
- `display`: `NotoSerif_700Bold`, `56/62`
- `headline`: `NotoSerif_700Bold`, `34/40`
- `title`: `NotoSerif_700Bold`, `26/32`

#### Sans hierarchy
- `body`: `Manrope_500Medium`, `16/24`
- `label`: `Manrope_700Bold`, `12/16`, `letterSpacing: 2`

Guidance:
- `Noto Serif` is for mastheads, section titles, plant names, and editorial hero moments.
- `Manrope` is for controls, metadata, body copy, form labels, and operational detail.
- Large serif titles should feel quiet and premium, not loud or compressed.

### Shadow Tokens

Base token:
- `shadowColor`: `rgba(27, 28, 25, 0.04)`
- `shadowOffset`: `{ width: 0, height: 12 }`
- `shadowOpacity`: `1`
- `shadowRadius`: `32`
- `elevation`: `0`

Additional shared shadow scale lives in `styles/shadows.ts`:
- `card`
- `floatingSheet`
- `stickyFooter`
- `modal`

Guidance:
- Prefer tonal layering over shadows.
- Use shadows sparingly for truly floating elements such as sheets, sticky footers, or modal surfaces.

---

## 3. Colors & Surface Philosophy

The palette is rooted in deep forest greens, softened terracotta, botanical olives, and breathable linen neutrals.

### The No-Line Rule

Hard 1px section dividers should not be the default way we create hierarchy. Prefer:

- background color shifts
- tonal elevation between parent and child surfaces
- whitespace and rhythm
- typography hierarchy

If a separator is necessary, use a subtle rule with `outlineVariant` at low opacity.

### Surface Hierarchy & Nesting

Treat the interface like stacked paper and archival materials:

- **Base canvas:** `surface`
- **Soft recessed section:** `surfaceContainerLow`
- **Lifted interactive card:** `surfaceContainerLowest`
- **Inset utility tray:** `surfaceContainerHigh`
- **Deeper grouping or top-area contrast:** `surfaceContainer` or `surfaceContainerHighest`

Common patterns already present in the app:
- `surface` screen background with `surfaceContainerLow` overview cards
- `surfaceContainerLowest` for interactive grouped rows and key cards
- `secondaryContainer` and `primaryFixed` for accent chips, icon tiles, and highlighted details

### Glass, Tint, and Gradient

The system supports soft atmospheric polish, but it should stay restrained.

- Floating/translucent treatments should tint with `surfaceTint` or nearby surface tokens rather than inventing new colors.
- Signature primary CTAs may use a subtle gradient from `primary` to `primaryContainer`.
- Do not overuse gradients on informational cards or utility trays.

---

## 4. Typography Rules

The system intentionally creates tension between:

- **The Voice:** Noto Serif
- **The Engine:** Manrope

### Use Noto Serif for
- hero titles
- editorial section titles
- plant names
- memorial and archival emphasis

### Use Manrope for
- body copy
- field labels
- buttons
- metadata
- status copy
- chips and pills

### Editorial Hierarchy

A common and recommended pattern across the app:
- small uppercase `Manrope` eyebrow in `secondary` or `onSurfaceVariant`
- followed by a serif headline or title
- followed by medium-weight `Manrope` body copy

This pattern is used across settings, plant detail, data/backup, and onboarding surfaces.

---

## 5. Component Rules

### Buttons

#### Primary
- pill or highly rounded shape
- `primary` or `primary -> primaryContainer` gradient
- `onPrimary` text
- used for main task completion and primary progression

#### Secondary
- typically `secondaryContainer`
- text uses `onSecondaryContainer`
- used for softer but still affirmative actions like support actions or premium prompts

#### Tertiary / text actions
- no filled surface
- text in `primary` or a contextual semantic color
- underline or decorative accent may use `primaryFixed`

### Cards and Lists

- Prefer rounded, paper-like surfaces
- avoid hard dividers between rows where spacing or tonal changes can do the job
- use `surfaceContainerLow` and `surfaceContainerLowest` as the main contrast pair

### Input Fields

The dominant pattern in the app is a minimalist tray:
- background: `surfaceContainerLow`
- radius: usually `14`
- label above the field in `Manrope`
- focus indicated by color shift and tonal emphasis, not aggressive outlines

If a stroke is needed, use a very soft `outlineVariant` treatment.

### Chips

Two chip patterns are common in the product:

#### Suggestion/filter chips
- inactive: `surfaceContainerHigh`
- active: `tertiaryContainer`
- active text often shifts to `surfaceBright`

#### Informational chips / badges
- often use `secondaryContainer`, `primaryFixed`, or `surfaceContainerHigh`
- use small `Manrope` label text
- keep padding compact and rounded to full pill shape

### Icon Tiles and Accent Capsules

Common supporting surface colors:
- `secondaryContainer` for warm emphasis
- `primaryFixed` for fresh botanical emphasis
- `tertiaryFixed` for muted botanical utility
- `surfaceContainerHigh` for neutral icon trays

### Timeline / Filmstrip Pattern

The "Growth Timeline" should feel visual first:
- rounded images
- filmstrip or gallery rhythm
- spacing-led grouping
- minimal chrome around image content

---

## 6. Settings-Screen Pattern

The current settings family is grounded by `features/profile/components/ProfileScreenScaffold.tsx`.

Shared behavior:
- top bar title is `Settings`
- left-aligned back affordance
- eyebrow, serif title, and optional descriptive copy
- body content uses a `gap: 20` rhythm

Recommended settings typography:
- eyebrow: `Manrope_700Bold`, `12/16`, letter spacing around `2.1-2.4`
- hero title: large serif headline
- body description: `Manrope_500Medium`, typically `16/28`
- card titles: usually around the `20/26` family
- supporting notes: typically `12/18` to `14/22`

The `Data & Backup`, `Change Password`, `Privacy & Security`, legal, and export screens should follow this family unless there is a clear product reason not to.

---

## 7. Do's and Don'ts

### Do
- use whitespace to create calm
- use photography generously, especially where memory, identity, or plant health are central
- layer surfaces tonally instead of boxing everything in
- keep controls warm and tactile rather than mechanical
- preserve consistency with tokenized spacing and type scales

### Don't
- use pure black text
- use bright generic "app" colors outside the token system
- default to hard borders or divider-heavy layouts
- introduce sharp corners
- make settings screens feel like admin dashboards
- invent one-off color values when an existing token already serves the purpose

---

## 8. Implementation Notes

### Theme source of truth
- App tokens: `styles/tokens.ts`
- Paper theme adapter: `config/theme.ts`
- Theme provider: `components/design-system/Theme.tsx`

### Important practical rule

When implementing UI changes:
- prefer existing token values over new hex codes
- prefer `useTheme()` colors over inline color literals
- preserve the Botanical Editorial tone even on dense operational screens

### Documentation correction

This file replaces older incomplete guidance that referenced only part of the palette. The tokens above are the current canonical values and should be used when auditing or extending the design system.

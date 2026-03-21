# Design System Strategy: The Botanical Editorial

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Conservatory**. 

Modern plant care is an intersection of rigorous science and organic beauty. This system rejects the "utilitarian grid" in favor of a high-end editorial experience. We aim to make the user feel like they are leafing through a premium independent botany magazine. By utilizing intentional asymmetry, oversized serif typography, and a "tonal layering" approach to depth, we move away from the "app-as-a-tool" and toward "app-as-an-experience." High-quality photography is the protagonist here; the UI is the elegant frame that supports it.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the earth: Deep forest greens (`primary`), sun-baked terracotta (`secondary`), and the soft, breathable neutrals of unbleached linen (`surface`).

### The "No-Line" Rule
To maintain a high-end, organic feel, **1px solid borders are strictly prohibited** for sectioning. Boundaries must be defined through:
- **Background Color Shifts:** Place a `surface-container-low` section against a `surface` background.
- **Tonal Transitions:** Use `surface-container-highest` to define a header area against a `surface-bright` body.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
- **Base Layer:** `surface` (#fbf9f4)
- **Secondary Content Areas:** `surface-container-low` (#f5f3ee)
- **Interactive Cards:** `surface-container-lowest` (#ffffff) to create a subtle "pop" without shadows.
- **Deep Inset/Utility:** `surface-container-high` (#eae8e3)

### The "Glass & Gradient" Rule
For floating elements (like a navigation bar or a "Quick Add" FAB), use **Glassmorphism**. Apply `surface-tint` at 5% opacity with a 20px backdrop blur. 
*Signature Polish:* Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#163828) to `primary-container` (#2d4f3e) at a 145° angle to give the button "soul" and a slight three-dimensional curvature.

---

## 3. Typography
The typographic system creates a tension between the "Human" (Serif) and the "Technical" (Sans).

- **The Voice (Display & Headline):** `notoSerif`. Use this for plant names, welcome messages, and editorial section titles. The large scale (`display-lg` at 3.5rem) should be used with tight letter-spacing to feel like a masthead.
- **The Engine (Title, Body, Label):** `manrope`. A clean, geometric sans-serif for utility. Use `body-lg` for plant care instructions and `label-md` for technical data like "Last Watered: 2d ago."
- **Editorial Hierarchy:** Use `headline-lg` for main categories, but pair it immediately with a `label-sm` in `secondary` (terracotta) for a sophisticated, tagged look.

---

## 4. Elevation & Depth
We define hierarchy through **Tonal Layering** rather than structural lines.

- **The Layering Principle:** To lift a card, do not reach for a shadow. Instead, place a `surface-container-lowest` card on top of a `surface-container` background. The slight shift in luminosity provides a sophisticated "soft lift."
- **Ambient Shadows:** If a floating element requires a shadow (e.g., a "Water Now" drawer), use an extra-diffused shadow: `y: 12px, blur: 32px, color: on-surface (4% opacity)`. This mimics natural, overcast garden light.
- **The Ghost Border Fallback:** If accessibility requires a stroke (e.g., an input field), use `outline-variant` (#c1c8c2) at **20% opacity**. Never use 100% opacity strokes.
- **Glassmorphism:** Use `surface_variant` at 60% opacity with a heavy backdrop-blur for overlays to keep the organic colors of the plant photography visible underneath.

---

## 5. Components

### Buttons
- **Primary:** Gradient (`primary` to `primary-container`), `rounded-full` (9999px). Padding: `spacing-4` (horizontal), `spacing-2.5` (vertical).
- **Secondary:** `secondary-container` (#fd9e7c) with `on-secondary-container` (#77331a) text. 
- **Tertiary:** No background. `primary` text with an underline using `primary-fixed` (#c5ebd4) at a 4px thickness.

### Cards & Lists
- **Rule:** **No divider lines.**
- Separation is achieved via `spacing-6` or `spacing-8` vertical gaps.
- Plant list items should use an asymmetrical layout: Image on the left (rounded-xl), followed by a `headline-sm` title and `label-md` metadata stacked vertically.

### Input Fields
- Avoid boxes. Use a "Minimalist Tray" approach: A `surface-container-low` background with `rounded-md` (0.75rem). The label (`label-md`) sits above the field in `on-surface-variant`.

### Chips
- Use `tertiary-container` (#404c36) for active filters (e.g., "Low Light") and `surface-container-highest` for inactive ones. 

### Signature Component: The "Growth Timeline"
- Instead of a standard vertical list, use a horizontal "filmstrip" of images. Each image uses `rounded-lg` (1rem) and is separated by `spacing-3`. This emphasizes the visual nature of plant tracking.

---

## 6. Do’s and Don’ts

### Do
- **Do** embrace white space. Use `spacing-10` and `spacing-12` between major sections to let the layout "breathe."
- **Do** use high-quality, desaturated photography. The UI colors are designed to complement greens and browns.
- **Do** overlap elements. Allow a plant image to slightly break the bounds of its container for a more organic, less "boxed-in" feel.

### Don’t
- **Don’t** use pure black (#000000) for text. Always use `on-surface` (#1b1c19) or `on-background` for a softer, premium reading experience.
- **Don’t** use 1px dividers to separate list items. Use spacing or subtle background shifts.
- **Don’t** use standard "Material Blue" or "Success Green" for alerts. Use the `error` (#ba1a1a) and `primary` tokens within the system’s specific tonal range.
- **Don’t** use sharp corners. Everything should have at least `rounded-DEFAULT` (0.5rem) to maintain the "organic" brand promise.
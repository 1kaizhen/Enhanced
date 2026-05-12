# Hexa — Design System & Visual Guidelines

A reference for building features inside the Hexa new-tab extension (and any companion surfaces). Hand this file to Claude Code or any contributor so the next module looks like it shipped with the rest of the product.

---

## 1. Brand identity

**Hexa** is a quiet, focused new-tab homepage. The aesthetic is a dark, glassy "calm console" — full-bleed photographic background, weightless typography, minimal chrome. Nothing competes with the user's content (clock, bookmarks, notes, tasks). Decoration is earned, never default.

**Voice**: short, human, lowercase-friendly. "Add bookmark" beats "Create new bookmark entry." Empty states sound like a friend, not a system: *"No bookmarks here yet."*

**Tone rules**
- Never use exclamation marks except in success states.
- Use sentence case in UI, never Title Case.
- Numbers and shortcuts in mono. Everything else in Manrope.

---

## 2. Typography

| Role | Family | Weight | Size | Tracking |
|---|---|---|---|---|
| Display clock | Manrope | 200 | `clamp(120px, 16vw, 220px)` | `-0.05em` |
| H1 / Panel title | Manrope | 600 | 17px | `-0.015em` |
| H2 / Section title | Manrope | 600 | 13–14px | `-0.01em` |
| Body | Manrope | 500 | 13–14px | `-0.005em` |
| Caption / meta | Manrope | 500 | 11.5–12px | `-0.005em` |
| Eyebrow / label | Manrope | 600 | 10.5–11px UPPERCASE | `0.12–0.20em` |
| Numbers, counts, shortcuts | JetBrains Mono | 500–700 | 10–11px | 0 |
| Quote | Manrope | 400 italic | 14.5px | normal |

**Rules**
- Only two families ever: **Manrope** + **JetBrains Mono**.
- Body and UI weight default = 500. Reserve 700+ for the badge counts and primary CTAs.
- Eyebrows above any form field or section: ALL CAPS, 10.5px, letter-spacing 0.12–0.14em, color `rgba(255,255,255,0.45)`.
- Never use Inter, Roboto, Arial, or system-ui.

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

---

## 3. Color

Hexa is a dark theme. Surfaces are translucent over a photographic backdrop — they get their darkness from `backdrop-filter` blur + a base of `rgba(20,20,22, …)`, not solid fills.

### Neutrals (foreground on dark)
| Token | Value | Use |
|---|---|---|
| `--fg-1` | `rgba(255,255,255,0.98)` | Primary text, headings |
| `--fg-2` | `rgba(255,255,255,0.85)` | Body text |
| `--fg-3` | `rgba(255,255,255,0.7)` | Secondary text, pill labels |
| `--fg-4` | `rgba(255,255,255,0.55)` | Tertiary, captions |
| `--fg-5` | `rgba(255,255,255,0.45)` | Eyebrows, placeholder hint |
| `--fg-6` | `rgba(255,255,255,0.32)` | Placeholder, disabled |
| `--stroke-1` | `rgba(255,255,255,0.07)` | Default panel border |
| `--stroke-2` | `rgba(255,255,255,0.1)` | Input underline, dock outline |
| `--stroke-3` | `rgba(255,255,255,0.18)` | Hover / focus border |

### Surface scrims (over photo bg)
| Token | Value | Use |
|---|---|---|
| `--surf-glass` | `rgba(20,20,22,0.45)` + blur(20px) saturate(160%) | Pills, dock, status chips |
| `--surf-modal` | `rgba(14,14,16,0.78)` + blur(40px) saturate(160%) | Modals & sheets |
| `--surf-popover` | `#0E0E10` solid | Menus, popovers (no blur needed — small surface) |
| `--surf-input` | `transparent` with `border-bottom: 1px solid var(--stroke-2)` | Sheet inputs |

### Accent palette (bookmarks / folders / priorities)
8 fixed swatches — never mix in arbitrary hex codes.
```
#E8623B  Coral
#3B82F6  Blue
#7C3AED  Violet
#10B981  Emerald
#F59E0B  Amber
#EF4444  Red
#0F172A  Ink
#0EA5E9  Sky
```

### Semantic
| Token | Value |
|---|---|
| `--success` | `#10B981` |
| `--warn` | `#F59E0B` |
| `--danger` | `#EF4444` |
| `--info` | `#3B82F6` |

### Note paper colors (light, used inside dark sheets)
```
#FFF6C7 / fg #3B2A07    Yellow
#FED7D7 / fg #4A1A1A    Pink
#C4F1D2 / fg #0F2C1B    Green
#CFE6FF / fg #0A2238    Blue
#EADCFF / fg #241040    Purple
#FFE4C4 / fg #3D2010    Peach
```

---

## 4. Spacing

A 4-pt scale. Don't invent values.

| Token | px |
|---|---|
| `s-0` | 2 |
| `s-1` | 4 |
| `s-2` | 6 |
| `s-3` | 8 |
| `s-4` | 10 |
| `s-5` | 12 |
| `s-6` | 14 |
| `s-7` | 16 |
| `s-8` | 18 |
| `s-9` | 20 |
| `s-10` | 24 |
| `s-12` | 32 |

**Default rhythms**
- Panel padding: 22px sides, 22px top, 24px bottom.
- Section gap inside a panel: 18px between groups, 6px between label and control.
- Grid gap for tile grids (folder 5x5): 6px.
- Dock gap between tiles: 4px.
- Pill / chip padding: `6px 11px`.

---

## 5. Radii & elevation

| Token | px | Use |
|---|---|---|
| `r-pill` | 999 | Pills, chips, toggles |
| `r-sm` | 7–9 | Tabs, small buttons, list rows |
| `r-md` | 10–12 | Inputs, cards, tiles, popovers |
| `r-lg` | 14 | Menus, search bar |
| `r-xl` | 20 | Modals, sheets |

**Elevation**
- Resting cards: no shadow, just border `1px solid rgba(255,255,255,0.07–0.1)`.
- Hover lift: `transform: translateY(-1px to -2px)` + soft shadow `0 10px 28px rgba(0,0,0,0.28)`.
- Modals: `0 24px 60px rgba(0,0,0,0.5)`.
- Popovers / menus: `0 20px 50px rgba(0,0,0,0.5)`.
- Dock icons (bookmark tiles): `0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)`.

---

## 6. Motion

All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` (gentle ease-out) or `ease`.

| Pattern | Duration |
|---|---|
| Hover state | 0.15s ease |
| Press / toggle | 0.12s ease |
| Popover in (popIn) | 0.18s |
| Sheet in (sheetIn) | 0.28–0.32s |
| Fade overlay | 0.22s |
| Clock colon blink | 0.4s |

Animations:
```css
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes popIn { from { transform: translateY(6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes sheetInRight { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes sheetInLeft  { from { transform: translateX(-24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes sheetInCenter { from { transform: scale(0.96) translateY(8px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }
```

Never: bounce/spring overshoot. Never: animations longer than 400ms.

---

## 7. Iconography

- **Stroke only**, never filled.
- 24×24 viewBox, `stroke-width: 1.6`, `stroke-linecap: round`, `stroke-linejoin: round`.
- Default render size: 14–18px. Header actions: 16px. Tiny indicators: 10–12px.
- No emoji in UI (notes' user content is the only place a user might paste them in).

Inline SVG, not icon fonts. Keep the `<Icon>` component centralised.

---

## 8. Components

### 8.1 Glass pill (chip / status / nav)
```css
display: inline-flex; gap: 8px;
padding: 9px 16px 9px 13px;
background: rgba(20,20,22,0.42);
backdrop-filter: blur(20px) saturate(160%);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 999px;
font-size: 13px; font-weight: 500;
```
- Hover: bg `rgba(30,30,32,0.6)`, border `rgba(255,255,255,0.18)`, `translateY(-1px)`.
- Counts inside: rounded pill `rgba(255,255,255,0.14)` 10.5px JetBrains Mono.

### 8.2 Bookmark tile (dock + folder grid)
- 42–46px square icon, radius 12–13px.
- 2-letter initial, weight 700, color `#fff`, `letter-spacing: -0.02em`.
- Label below: 11–11.5px, weight 500, `rgba(255,255,255,0.75–0.85)`.
- Hover: parent gets `background: rgba(255,255,255,0.04–0.06)` + `translateY(-2px)`.
- Delete-on-hover: tiny black circle, 18×18, with × icon size 10.

### 8.3 Folder tile
Same shell as bookmark tile but **never show a count**. Icon = stroke folder glyph centered, no badge. Click opens folder modal.

### 8.4 Search bar
- Glass slab, radius 14, padding 6.
- Engine selector on left = 20×20 gradient square + chevron.
- Input: 14.5px, transparent, no border.
- Submit button: 38×38, radius 10, `rgba(255,255,255,0.08)`.
- Focus: stronger border `rgba(255,255,255,0.28)`, `translateY(-1px)`, shadow `0 12px 40px rgba(0,0,0,0.35)`.

### 8.5 Modal / sheet
The unified shell for **all** modals (notes, todo, folder, add bookmark, add folder, tweaks).
- Surface: `rgba(14,14,16,0.78)` + `backdrop-filter: blur(40px) saturate(160%)`.
- Border: `1px solid rgba(255,255,255,0.08)`.
- Radius: 20px.
- Shadow: `0 24px 60px rgba(0,0,0,0.5)`.
- Padding: 22px sides; head 22/22/18, body padding 4/22/24.
- Variants by `side`:
  - `right` (default) — full-height drawer, 440px wide, slides from right.
  - `left` — full-height drawer, slides from left.
  - `center` — modal dialog, 520px wide, `max-height: calc(100vh - 64px)`, scale-up entry.
- Head: `<h2>` 17px/600 + caption 11.5px/500 `--fg-5`. Action group on right.
- **Head action buttons**: 34×34, radius 9, bg `rgba(255,255,255,0.05)`, border `rgba(255,255,255,0.07)`. Danger variant on hover: bg `rgba(239,68,68,0.14)`, color `#EF4444`. Always group: `[primary action] [destructive] [close ×]`.

### 8.6 Sheet form
- Eyebrow label above each field (UPPERCASE 10.5px).
- Inputs are **underline only** (`border-bottom: 1px solid rgba(255,255,255,0.1)`), font-size 14, transparent bg.
- On focus: underline goes to `rgba(255,255,255,0.4)`.
- Footer: divider line on top (`border-top: 1px solid rgba(255,255,255,0.06)`), buttons right-aligned, 8px gap.
- **Cancel button** (ghost): transparent, `rgba(255,255,255,0.7)`, padding 10/18, radius 10, weight 600, 13px.
- **Primary button**: solid `#fff` / text `#0a0a0a`, same metrics.

### 8.7 Split CTA button (e.g. Add bookmark + caret)
- Main pill: radius 999 except top-right / bottom-right which are 0.
- Caret: separate 24–30px wide button, radius 0/999/999/0, divider stroke between halves at `rgba(255,255,255,0.04)`.
- Caret triggers a popover menu with rich rows (icon + bold title + caption).

### 8.8 To-do row
- 18px circular checkbox, border-color = priority color.
- Priority dot: 7–12px circle on left, cycle `high → med → low` on click.
- Strikethrough + opacity 0.4 when done.
- Hover reveals delete icon at far right.

### 8.9 Note card
- Light pastel bg from the 6-color palette; text fg paired to it.
- Header row: pin button (left) — color swatches (center) — trash (right).
- Pinned state: black "PINNED" chip absolutely positioned at top-left.
- Textarea: transparent, no border, inherits color from card fg.

### 8.10 Folder modal grid
- `display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px`.
- Each tile is a bookmark with hover-reveal × delete.
- Last tile = "Add" with dashed icon variant.
- Empty state spans full row.

---

## 9. Layout & screen rhythm

**Background**: full-bleed photographic image, covered by a radial+linear vignette (opacity ~55%). Never a flat color.

**Z-index scale**
```
0   bg
1   bg-vignette
5   center stack (clock, search, bookmarks)
10  topbar, status pills, bottom-left
20  popovers (add-pop)
30  add-menu scrim & content
50  engine menu
100 modal overlay
```

**Page composition (new-tab)**
- 80px vertical padding on the centered column.
- Clock + eyebrow stacks tightly (no margin-bottom > 14px between greeting and clock).
- Search bar sits 28px below quote.
- Bookmarks dock sits 28px below search; max-width `min(720px, 92vw)`.

---

## 10. Accessibility & touch

- All interactive surfaces ≥ 32×32 hit target. Header actions are 34×34.
- Focus visible: keep default browser focus ring or replace with `outline: 2px solid rgba(255,255,255,0.5); outline-offset: 2px;`.
- Color contrast: body text is `rgba(255,255,255,0.85)` over the average glass scrim — passes AA. Don't drop below `--fg-3` for any readable text.
- Keyboard:
  - `Esc` closes any open panel/modal.
  - `⌘N` / `Ctrl+N` → Notes.
  - `⌘T` / `Ctrl+T` → To-do.
  - Forms submit on Enter; first input autoFocus.
- Persisted shortcut hints render via `<kbd>` with mono font.

---

## 11. Data persistence

All user data lives in `localStorage` under the `hexa.*` namespace:
- `hexa.bookmarks` — array of `{ id, name, url, color, folderId }`.
- `hexa.folders` — array of `{ id, name, color }`.
- `hexa.notes` — array of `{ id, body, color, pinned, ts }`.
- `hexa.todos` — array of `{ id, text, done, priority, ts }`.

Use the `useLocalStorage(key, initial)` hook (in `app.jsx`) for any new persistent state. IDs use the `uid()` 7-char base-36 helper.

---

## 12. Code conventions

- **Styling**: vanilla CSS in `styles.css`, no Tailwind, no CSS-in-JS. Keep selectors flat and named (`.dock`, `.dock-item`, `.dock-icon`).
- **Tokens-as-classes**: prefer reusing existing component classes over inventing new ones — extend with modifier classes (`.folder-tile-add`, `.note.pinned`).
- **React**: function components, hooks only, no class components. Keep all helper hooks (`useLocalStorage`, `useNow`) at top of `app.jsx`.
- **Icons**: extend the `<Icon>` map in `app.jsx`; never inline SVG in JSX outside it.
- **Panel**: always use the shared `<Panel>` component for modals. Pass `side="center" | "left" | "right"` and `headerActions={…}` for header CTAs.
- **No external UI libs** (no Radix, MUI, Headless, Framer Motion). CSS transitions only.
- **Filenames**: human readable for shipped HTML ("Hexa New Tab.html"), kebab-case for code (`tweaks-panel.jsx`).

---

## 13. Do / Don't

✅ Do
- Use translucent surfaces with backdrop-blur for any floating chrome.
- Stick to the 8-color accent palette.
- Use underline-only inputs inside sheets.
- Lead modals with an eyebrow label, not a colon-separated "Field:" pattern.
- Animate translate/scale; keep durations under 400ms.

🚫 Don't
- Don't add filler illustrations, gradients-as-decor, or emoji.
- Don't put a colored left-border accent on cards.
- Don't add badge counts to folder tiles.
- Don't introduce a new typeface or weight outside the table in §2.
- Don't use bordered/filled "form panel" inputs — always underline-only inside sheets.
- Don't use `overflow: auto` inside artboards or static cards — let height grow.

---

## 14. Quick CSS variables (drop-in)

```css
:root {
  /* fg */
  --fg-1: rgba(255,255,255,0.98);
  --fg-2: rgba(255,255,255,0.85);
  --fg-3: rgba(255,255,255,0.70);
  --fg-4: rgba(255,255,255,0.55);
  --fg-5: rgba(255,255,255,0.45);
  --fg-6: rgba(255,255,255,0.32);

  /* stroke */
  --stroke-1: rgba(255,255,255,0.07);
  --stroke-2: rgba(255,255,255,0.10);
  --stroke-3: rgba(255,255,255,0.18);

  /* surface */
  --surf-glass: rgba(20,20,22,0.45);
  --surf-modal: rgba(14,14,16,0.78);
  --surf-popover: #0E0E10;

  /* accents */
  --accent-coral: #E8623B;
  --accent-blue:  #3B82F6;
  --accent-violet:#7C3AED;
  --accent-emerald:#10B981;
  --accent-amber: #F59E0B;
  --accent-red:   #EF4444;
  --accent-ink:   #0F172A;
  --accent-sky:   #0EA5E9;

  /* radii */
  --r-pill: 999px;
  --r-sm: 8px;
  --r-md: 11px;
  --r-lg: 14px;
  --r-xl: 20px;

  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --t-fast: 0.15s;
  --t-mid:  0.22s;
  --t-slow: 0.32s;
}
```

---

*Last updated alongside Hexa New Tab v1. When adding a new component, add a section here before shipping.*

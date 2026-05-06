# Folio v1 — Product Hunt Launch Plan

## Context

Folio is a Chrome MV3 new-tab dashboard (bookmarks dock + tasks + clock + search). The core is solid and the visual baseline (Inter/Fraunces, glassmorphism, mosaic folder previews, draggable dock) is already differentiated from generic bookmark grids. To hit a Product Hunt launch in 1–2 weeks with strong Twitter/YouTube material, we need **3–4 hero features that ship polished**, plus one signature 30-second demo moment that survives compression on social timelines.

Guiding principle: ship fewer features at gallery quality rather than many features at draft quality. Every feature must look great in a still screenshot **and** demo well in a 5-second clip.

User priorities: **Visual wow + Productivity power + Integrations**. AI deferred to v2.

---

## Hero features (the launch four)

### 1. Theme & Background system  *(Visual wow centerpiece)*
A single Settings panel that controls the entire look. This is the screenshot factory — every theme combo is a tweetable image.

- **Backgrounds**: Unsplash search by keyword, image upload (stored as base64 in `chrome.storage.local`), curated preset gallery (current array becomes "Folio Originals"), solid color, and **animated gradient** (CSS `@property` + keyframe morph between 2–3 stops). Time-of-day mode: auto-shift wallpapers on sunrise/sunset.
- **Accent color**: replaces the hardcoded `--accent` token across dock highlights, search-go button, todo check, and active states. Color picker + 8 curated swatches.
- **Font pair**: 3 presets (current Inter+Fraunces, Geist+Instrument Serif, IBM Plex+EB Garamond) — font swap is *very* tweetable.
- **Glass intensity slider**: blur radius from 0 (clean flat) to 60 (heavy frosted). One slider that visibly transforms the whole UI.

### 2. Command Palette (Cmd/Ctrl-K)  *(Signature demo moment)*
This is the feature that goes in the launch video. Single keyboard shortcut, instant fuzzy search across:
- Every bookmark (title + URL + folder name)
- Every folder (open folder)
- Every todo (toggle done, jump to)
- **Actions**: New bookmark, New folder, Toggle focus mode, Start pomodoro, Switch theme, Change search engine, Clear completed
- **Web search fallback**: if no matches, "Search Google for '...'" as the bottom row, Enter to launch

Fuzzy match via simple subsequence scoring (no fuse.js dep — keep zero-deps). Arrow keys + Enter. Smooth scale-in animation. Glass panel centered, ~520px wide, max 8 results.

### 3. Focus Mode + Pomodoro  *(Productivity hook)*
Triggered from the command palette or a small icon next to the clock. Full-screen mode that:
- Hides dock, todo pane, weather, quote
- Centers the clock + a circular progress ring around it
- 25/5/15 work/short/long break cycle, configurable
- Optional ambient audio (rain / brown noise / lofi), streamed from a single small WebM hosted via a CDN URL or bundled file
- On completion: gentle chime + push browser notification (`notifications` permission)
- **Streak counter** persisted: "🔥 4-day streak, 12 sessions this week" — visible in non-focus mode under the clock

This is the YouTube workflow-demo feature.

### 4. Spotify Now Playing widget  *(Integrations flagship)*
Bottom-right glass card (mirrors the weather position on the left): album art, track, artist, scrubbing progress bar, prev/play/next controls.
- OAuth via Spotify Web API (`host_permissions` for `api.spotify.com`, `accounts.spotify.com`)
- Refresh token stored in `chrome.storage.local`
- Polls `/me/player/currently-playing` every 5s while tab is visible
- Disabled state: subtle "Connect Spotify" button — clicking opens OAuth in a popup

**Risk note**: OAuth flow is the biggest unknown. Budget 2 days. If it slips past day 10, swap for a no-auth crypto/stocks ticker (free CoinGecko + Yahoo Finance proxy) — visually similar real-estate, ships in 4 hours, still reads as "integrations" on the launch page.

---

## Quality-of-life polish (cheap, high-leverage)

These are the small details reviewers screenshot and tweet:

- **Page-load reveal**: clock fades+scales from 0.96, dock rises 20px with stagger across tiles (~400ms total)
- **Drag ghost**: replace browser default with a clean rendered preview (offscreen canvas + `setDragImage`)
- **Onboarding**: empty state with 3 sample bookmarks ("Try dragging me into a folder ↗"), inline tip on first Cmd-K hint, dismissed on first interaction
- **Sync**: switch the persisted keys to `chrome.storage.sync` for `categories`/`bookmarks` (cap at 100KB; keep todos local since they may exceed). Tweetable: "Setup once, same dock on every Chrome window/device."
- **Bookmark capture polish**: when adding a URL, fetch the page title in the background (`fetch` + parse `<title>`) and pre-fill if the title field is empty
- **Right-click on bookmark inside folder**: same context menu pattern as dock tiles (edit/delete) — currently only the hover delete button works
- **Keyboard nav**: dock tiles already have `tabindex=0`, add visible focus ring; arrow keys to traverse

---

## Files to modify

The codebase is three files. Every change lands in:
- `newtab.html` — add settings panel, command palette, focus mode overlay, Spotify card markup
- `style.css` — theme variables driven by JS, glass intensity custom prop, command-palette + focus-mode styles, page-load animations
- `app.js` — settings module, command palette module, pomodoro module, Spotify auth module, sync upgrade

New module structure inside `app.js` (still single file per project convention — see CLAUDE.md):
- `// ── Settings & Theme ────────`
- `// ── Command palette ─────────`
- `// ── Focus / Pomodoro ────────`
- `// ── Spotify ─────────────────`

Reuse existing utilities:
- `store.get/set` (`app.js:8`) — already swaps chrome.storage / localStorage. Keep dual-mode behavior intact for new keys (`folio_theme`, `folio_focus_streak`, `folio_spotify_token`, etc.).
- `escapeHtml`, `uid`, `getDomain` (`app.js:20-23`) — reuse.
- `renderIcon` + Phosphor classes — reuse for command-palette icons and settings panel.
- `closePopup` / `openPopup` / `popup-backdrop` (`app.js:389-407`) — same backdrop pattern for command palette and settings.
- `floating-form` CSS class (`style.css:717`) — reuse for the settings panel chrome.
- `context-menu` CSS pattern — reuse styling for command palette rows.

Manifest changes (`manifest.json`):
- Add `notifications` permission (Pomodoro chime)
- Add `host_permissions` for `https://api.spotify.com/*`, `https://accounts.spotify.com/*`, `https://api.unsplash.com/*`
- If using `chrome.storage.sync`, no extra permission needed (`storage` covers both)

---

## Two-week execution plan

**Week 1 — Visual + signature demo**
- Day 1: Settings panel scaffold (open via gear icon in dock, glass floating-form). Wire theme persistence.
- Day 2: Background system — Unsplash search (free dev tier), upload, animated gradient, time-of-day. Accent color + glass slider.
- Day 3–4: Command palette. Build fuzzy scorer, indexer, action registry. Animation in/out.
- Day 5: Focus mode overlay + Pomodoro state machine. Streak counter.
- Day 6: Pomodoro audio + notifications + chime.
- Day 7: Page-load reveal animations, drag ghost, onboarding empty state.

**Week 2 — Integration + launch prep**
- Day 8: Spotify OAuth flow (chrome.identity.launchWebAuthFlow). Token refresh.
- Day 9: Spotify card UI + polling. Fallback to crypto ticker if blocked.
- Day 10: chrome.storage.sync migration + bookmark capture (auto-title). Right-click in folder.
- Day 11: Cross-browser test, edge cases (no internet, revoked token, huge bookmark counts).
- Day 12: Record launch video (15s hero clip + 60s walkthrough). Build the 4-up screenshot grid.
- Day 13: Product Hunt copy, hunter outreach, gallery prep, Twitter teaser thread drafted.
- Day 14: Submit. Buffer for emergencies.

---

## Signature 15-second demo (the hook)

Storyboard for the launch tweet/PH gallery video:

1. **0–2s**: New tab opens, dock rises with stagger, clock fades in. (Page-load animation.)
2. **2–4s**: Cmd-K. Palette appears. User types "des" — Design folder, then "Dribbble" bookmark filter top.
3. **4–6s**: Type "theme". "Switch theme → Aurora" action. Background morphs into animated gradient. Accent shifts to lavender.
4. **6–9s**: Type "focus". Focus mode triggered. Everything fades out except the clock with a Pomodoro ring filling.
5. **9–12s**: Cut to the Spotify card glowing softly bottom-right, track changing.
6. **12–15s**: Cut back to the dock, drag a folder, drop a bookmark in. End card: "Folio. Your new tab, finally."

The demo proves: it's beautiful, it's fast, it's a real productivity tool, it integrates with your life.

---

## Ideas explicitly cut (saved for v2)

- **AI features** (NL task parsing, summarize tabs, smart suggestions) — high payoff but the user deprioritized AI; defer.
- **Calendar / GitHub widgets** — heavier OAuth than Spotify; ship one integration well rather than three poorly.
- **Notes/scratchpad** — overlaps with todos; revisit if user testing demands it.
- **Theme marketplace / sharing** — depends on theme system; ship system first, marketplace v2.
- **Habit tracker / wellness module** — clean v2 angle for "Folio: now with mindfulness."
- **Multi-account / cloud sync beyond chrome.storage.sync** — needs backend; not v1.

---

## Verification

End-to-end test plan before submission:

1. **Fresh install**: load unpacked on a clean Chrome profile. Verify onboarding empty state appears, sample bookmarks render.
2. **Theme system**: cycle every preset background, upload a custom image, change accent and font, drag the glass slider 0→60. Reload → state persists.
3. **Command palette**: open with Cmd-K from search input, todo input, and idle state. Search bookmark, folder, todo, action. Arrow nav + Enter on each result type. Web search fallback.
4. **Focus mode**: start pomodoro, verify ring animates, complete a session (use a 10s test cycle in dev), confirm chime + notification. Check streak counter increments.
5. **Spotify**: OAuth flow round-trips. Disconnect and reconnect. Tab open while music plays — card updates within 5s.
6. **Sync**: install on a second Chrome profile signed into the same Google account, confirm bookmarks/folders appear.
7. **Edge cases**: 100 bookmarks (Cmd-K still feels instant), no internet (Spotify shows "offline" gracefully, Unsplash search degrades to presets), background image fails to load (fallback color).
8. **Performance**: Lighthouse score on the new tab, target <50ms scripting time, <100KB JS.
9. **Demo recording**: rehearse the 15-second demo until consistent in one take.

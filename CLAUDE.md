# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Folio — a Chrome Manifest V3 extension that overrides the new-tab page (`chrome_url_overrides.newtab` → `newtab.html`) with a bookmarks + to-do dashboard, plus a now-playing media widget that controls audio/video in any other tab. No build system, no dependencies, no tests. Pure HTML/CSS/vanilla JS.

Permissions (`manifest.json`): `storage`, `unlimitedStorage`, `tabs`, `scripting`, and `host_permissions: ["<all_urls>"]` — the broad host access exists solely so the media content script can attach to any site. Don't widen further without reason.

## Loading / running

- Load unpacked: Chrome → `chrome://extensions` → Developer mode → "Load unpacked" → select this directory.
- After editing files, click the reload icon on the extension card and open a new tab.
- For quick iteration outside Chrome, opening `newtab.html` directly in a browser also works — see storage shim below.

## Architecture

Two subsystems share the extension:

**Newtab SPA** (runs in the new-tab page):
- `manifest.json` — MV3, overrides newtab, declares background worker + content script.
- `newtab.html` — static markup for both panels (Bookmarks, To-Do), forms, filter tabs, and the media widget. All interactive elements are referenced by `id` from `app.js`.
- `app.js` — single-file SPA logic. State lives in module-level arrays (`categories`, `bookmarks`, `todos`) and is rendered by `renderBookmarks()` / `renderTodos()`. Mutations call `saveAll()` / `saveTodos()` then re-render.
- `style.css` — design tokens via CSS custom properties (`--accent`, category color vars).

**Media broker** (runs across all tabs):
- `background.js` — MV3 service worker. Tracks the currently-audible tab (`currentMediaTabId`) and per-tab state in a `Map`. Listens to `chrome.tabs` events (`onUpdated.audible`, `onActivated`, `onRemoved`) and `chrome.windows.onFocusChanged` to decide which tab is "current". Service workers can be killed at any time — `bootstrapFromAudibleTabs()` re-runs on every wake (`onStartup`, `onInstalled`, and module load) to rebuild state by querying audible tabs and asking each http(s) tab to resync.
- `media-content.js` — injected into every page (`<all_urls>`, `document_idle`). Picks the "primary" `<video>`/`<audio>` element via a heuristic (`pickPrimary`: playing > unmuted > has duration > visible area), reports state to the worker, and accepts commands. Uses `navigator.mediaSession.metadata` for title/artist/artwork when available, falls back to `og:image` / favicon. The `__folioMediaInjected` guard prevents double-injection.
- Site-specific next/prev selectors live in `SITE_RULES` (YouTube, YT Music, Spotify, Apple Music, SoundCloud). Generic `next` is a no-op; generic `previous` seeks to 0.

### Message protocol (newtab ↔ worker ↔ content)

All messages have a `type` string. Use these names exactly when adding handlers:

- `media:state` — content → worker. Payload `{ state }` or `{ state: null }` to clear.
- `media:update` — worker → newtab (broadcast via `chrome.runtime.sendMessage`). Payload `{ state, tabId }`.
- `media:getState` — newtab → worker. Sync request; worker triggers a `bootstrapFromAudibleTabs()` if it has nothing.
- `media:resync` — worker → content. Forces content to re-push state (resets `lastSentJson`).
- `media:command` — newtab → worker → content. `cmd` is `playPause` | `next` | `previous`.
- `media:focus` — newtab → worker. Activates the current media tab + focuses its window.

`sendResponse` callers must `return true` to keep the channel open for async replies. Errors are swallowed via `void chrome.runtime.lastError` since tabs/workers can disappear mid-message.

### Storage abstraction (`app.js:8`)

The `store` object transparently swaps between `chrome.storage.local` (when running as extension) and `localStorage` (when opened as a plain file). Keep this dual-mode behavior intact when adding new persisted state — guard chrome API access via `isExtension`.

Three tiers of persistence, used deliberately:

- **`store` (chrome.storage.local / localStorage)** — domain data that participates in export/import: `folio_categories`, `folio_bookmarks`, `folio_todos`, `folio_notes`. `folio_wallpaper` exists only as a legacy nulling target — current wallpapers live in IndexedDB.
- **IndexedDB (`folio` DB, `wallpaper` store, key `'current'`)** — wallpaper blobs (image or mp4). Too large for `chrome.storage.local` quotas. Helpers: `wpGet` / `wpPut` / `wpDelete` (`app.js:139`+). Not included in JSON export.
- **`localStorage` directly** — UI-only prefs that should never sync or export: `folio_search_engine`, `folio_island_pos`, `folio_todo_expanded`, `folio_todo_width`. Use `localStorage` directly here even inside the extension; the `store` shim is only for domain data.

Backup/restore (`export-btn` / `import-btn`) round-trips only the four `store` keys as a JSON `{ version, exportedAt, folio_… }` envelope. If you add new domain state that should survive a reinstall, include it in both `saveAll`-equivalent and the export/import payload.

### Data shapes

- Category: `{ id, name, color, collapsed }` where `color` is a key into `CAT_COLORS` (gold/sage/rose/sky/lavender/amber).
- Bookmark: `{ id, title, url, categoryId }` — `categoryId` may reference a missing category (renders as "Uncategorized").
- Todo: priority is `low` | `medium` | `high`. May carry a Pomodoro-style timer.
- Note: sticky note with a persisted position and color.

IDs come from `uid()` (timestamp + random suffix) — not cryptographically unique, fine for local-only data.

### Rendering model

Full re-render on every mutation (no diffing). Drag-and-drop reordering is implemented via drop zones inserted between items (`makeCatDropZone`, etc.). When changing list-mutating logic, remember to re-call the render function so the DOM stays in sync with state.

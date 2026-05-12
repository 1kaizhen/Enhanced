# Orbit — Bookmarks, Tasks & Now Playing

A Chrome new-tab replacement that turns every empty tab into a calm, glassy dashboard: a folder dock for bookmarks, a tasks panel with timers and priorities, sticky notes, custom wallpapers, and a now-playing widget that controls audio and video in any other tab.

Built as a Manifest V3 extension. No build system, no dependencies, no tracking — pure HTML, CSS, and vanilla JavaScript.

## Features

- **Bookmark dock** — organize links into colored, icon-tagged folders. Drag to reorder; click to open the folder popup.
- **Tasks panel** — add to-dos with low/medium/high priority, attach Pomodoro-style timers, and filter by All / Active / Done.
- **Sticky notes** — pin colored notes anywhere on the page; their position persists.
- **Now-playing widget** — detects the audible tab across your browser, shows title/artist/artwork (via `mediaSession`, `og:image`, or favicon), and exposes play/pause/next/previous. Site-specific selectors for YouTube, YouTube Music, Spotify, Apple Music, and SoundCloud.
- **Custom wallpaper** — set any image (JPG/PNG/WebP) or MP4 video as your background.
- **Search bar** — switch search engines with one click.
- **Backup & restore** — export and import all your data as JSON.
- **Local-first** — everything lives in `chrome.storage.local` and IndexedDB. Nothing leaves your browser.

## Install (unpacked)

1. Clone or download this repository.
2. Open Chrome and visit `chrome://extensions`.
3. Toggle **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Open a new tab.

To pick up changes during development, click the reload icon on the extension card and open a new tab.

## Build a release zip

```bash
./build.sh        # macOS / Linux
./build.ps1       # Windows PowerShell
```

The output lands in `dist/orbit-<version>.zip`, ready to upload to the Chrome Web Store.

## Permissions

| Permission | Why |
|---|---|
| `storage`, `unlimitedStorage` | Persist bookmarks, tasks, notes, and wallpaper |
| `tabs` | Detect which tab is currently audible |
| `scripting` | Resync the media content script after the worker wakes |
| `<all_urls>` host access | The content script attaches to any site so the now-playing widget can read and control its media element |

No analytics, no remote calls, no telemetry.

## Project structure

```
manifest.json        MV3 manifest — declares newtab override, worker, content script
newtab.html          Static markup for the dashboard
style.css            Design tokens and layout
app.js               SPA logic: bookmarks, tasks, notes, settings, search, render loop
background.js        Service worker — tracks the audible tab and brokers media messages
media-content.js     Content script injected into every page — picks the primary
                     <video>/<audio>, reports state, accepts media commands
icons/               Extension icons (16, 48, 128) and search-engine glyphs
vendor/              Bundled fonts and icon CSS (Manrope, Phosphor)
build.sh / build.ps1 Build a release zip from the source files
```

## Architecture notes

- **Storage shim** (`app.js`) transparently swaps `chrome.storage.local` for `localStorage` so you can open `newtab.html` directly in a browser for quick iteration.
- **Service worker resilience** — workers are killed at any time. `bootstrapFromAudibleTabs()` re-runs on `onStartup`, `onInstalled`, and module load to rebuild media state.
- **Message protocol** between newtab ↔ worker ↔ content uses `media:state`, `media:update`, `media:getState`, `media:resync`, `media:command`, `media:focus`. See `CLAUDE.md` for the full contract.
- **Render model** — full re-render on every mutation. State lives in module-level arrays; mutations call the relevant save helper and then re-render.

## Tech

- Manifest V3
- Vanilla JS (no framework, no bundler)
- Phosphor Icons
- Manrope (bundled)

## License

MIT

## Contributing

Issues and pull requests are welcome. Keep it dependency-free and respect the local-first principle: nothing should phone home.

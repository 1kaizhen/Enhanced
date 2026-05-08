# Folio — Chrome Web Store listing copy

Drop-in content for the Chrome Web Store dashboard. Update fields in brackets before submitting.

## Item summary

- **Name:** Folio — Bookmarks & Notes
- **Short name:** Folio
- **Category:** Productivity
- **Language:** English
- **Version:** 1.0.0
- **Single purpose:** Replaces the new tab page with a local-first bookmarks, to-do, and notes dashboard, plus a media widget that controls audio/video in any other tab.

## Short description (≤132 chars)

A calm new-tab homepage for bookmarks, to-dos, sticky notes, and a media widget that controls audio in any tab.

## Detailed description

Folio replaces Chrome's new tab page with a single, calm dashboard:

- **Bookmark dock** — pin links and group them into colored folders. Right-click to edit; drag to reorder.
- **To-do list** — quick capture, priorities, completion timer, sticky notes.
- **Media island** — when a tab plays audio or video, Folio shows the title, artwork, and play/pause/next/previous controls right on the new tab. Works with YouTube, YouTube Music, Spotify Web, Apple Music Web, SoundCloud, and any site that exposes the standard media session.
- **Search** — pick Google, Bing, or DuckDuckGo from the search bar.
- **Wallpapers** — choose from a small built-in rotation or upload your own image or MP4. Stored locally via IndexedDB.
- **Backup** — export and import bookmarks, folders, tasks, and notes as a single JSON file.

Everything is stored on your device. No account, no sync server, no analytics.

## Permission justifications

| Permission | Why it is needed |
| --- | --- |
| `storage` | Persist bookmarks, folders, tasks, and notes via `chrome.storage.local`. |
| `unlimitedStorage` | Lets users save large wallpaper images or MP4 files locally without quota errors. |
| `tabs` | Identify the currently-audible tab so the media widget can target it, and switch to it when the user clicks the artwork. |
| `scripting` | Required by Manifest V3 for the declared content script that detects media on each page. |
| Host permission `<all_urls>` | The media content script must run on any page where audio or video may play in order to read its state and forward play/pause/next/previous commands. No page content is read or transmitted. |

## Privacy disclosures

**Data Folio collects:** none.

**Data Folio stores locally on your device:**
- Bookmarks, folders, tasks, sticky notes (in `chrome.storage.local`).
- Uploaded wallpaper images or videos (in IndexedDB).

**Outbound network requests:**
- **Search:** when you submit the search bar, your browser navigates to the search engine you chose (Google, Bing, or DuckDuckGo).
- **Default wallpapers:** the rotating background images are fetched from `images.unsplash.com`. If you upload your own wallpaper, no Unsplash request is made.
- **Bookmark favicons:** small icons for bookmarks are loaded from `https://www.google.com/s2/favicons`. Only the bookmark domain is sent — never URLs, titles, or any user content.
- **Media metadata:** read from the page's own `navigator.mediaSession`. Nothing is sent anywhere; commands stay between the new tab page and the playing tab.

Folio does not use analytics, does not register accounts, does not sync to any server, and never transmits your bookmarks, tasks, notes, or browsing history.

## Single purpose statement

Folio replaces the new tab page with a local bookmarks, to-do, and notes dashboard, plus an in-page widget that controls media playing in another tab.

## Build and submit

```powershell
pwsh ./build.ps1
# produces dist/folio-1.0.0.zip
```

Upload `dist/folio-1.0.0.zip` to the Chrome Web Store developer dashboard under "Package".

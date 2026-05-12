/* ============================================================
   Orbit — vanilla SPA
   ============================================================ */

// ── Storage shim (chrome.storage.local ↔ localStorage) ───────
const isExtension = typeof chrome !== 'undefined' && chrome?.storage?.local;
const store = {
  async get(key) {
    if (isExtension) return new Promise(res => chrome.storage.local.get([key], r => res(r[key] ?? null)));
    return JSON.parse(localStorage.getItem(key) || 'null');
  },
  async set(key, val) {
    if (isExtension) {
      return new Promise((res, rej) => chrome.storage.local.set({ [key]: val }, () => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) rej(new Error(err.message)); else res();
      }));
    }
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { throw new Error(e.message || 'localStorage write failed'); }
  }
};

const $ = id => document.getElementById(id);
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Accent palette (Hexa) ────────────────────────────────────
const PALETTE = ['#E8623B','#3B82F6','#7C3AED','#10B981','#F59E0B','#EF4444','#0F172A','#0EA5E9'];

// Map legacy category color keys to the palette so existing user data
// renders without migration.
const LEGACY_CAT_COLOR_MAP = {
  gold: '#F59E0B', sage: '#10B981', rose: '#EF4444',
  sky: '#0EA5E9',  lavender: '#7C3AED', amber: '#F59E0B',
  teal: '#10B981', coral: '#E8623B',
};
function resolveColor(c) {
  if (!c) return PALETTE[0];
  if (typeof c === 'string' && c.startsWith('#')) return c;
  return LEGACY_CAT_COLOR_MAP[c] || PALETTE[0];
}

// ── Inline SVG helpers (Hexa Icon set) ───────────────────────
const ICON_PATHS = {
  plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search:  '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
  note:    '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
  check:   '<polyline points="4 12 10 18 20 6"/>',
  bookmark:'<path d="M6 4h12v16l-6-4-6 4z"/>',
  close:   '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  trash:   '<polyline points="4 7 20 7"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  chevron: '<polyline points="9 6 15 12 9 18"/>',
  edit:    '<path d="M14 4l6 6-10 10H4v-6z"/>',
  pin:     '<path d="M12 2v6"/><path d="M9 8h6l1 6H8z"/><line x1="12" y1="14" x2="12" y2="22"/>',
  folder:  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'folder-fill': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>',
  timer:   '<circle cx="12" cy="13" r="8"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="13" x2="15" y2="15"/><line x1="9" y1="3" x2="15" y2="3"/>',
  play:    '<polygon points="6 4 20 12 6 20 6 4"/>',
  pause:   '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>',
  prev:    '<polygon points="19 4 9 12 19 20 19 4"/><line x1="5" y1="4" x2="5" y2="20"/>',
  next:    '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20"/>',
  reset:   '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  gear:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};
function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
}
function faviconUrl(url, size = 128) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=${size}`;
  } catch { return ''; }
}
function bookmarkIconHtml(bm, size = 32) {
  const fav = faviconUrl(bm.url, 128);
  const initials = (bm.title || bm.url || '??').slice(0, 2).toUpperCase();
  if (fav) {
    return `<img class="bm-favicon" src="${fav}" width="${size}" height="${size}" alt="" loading="lazy" crossorigin="anonymous" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bm-fallback',textContent:${JSON.stringify(initials)}}))"/>`;
  }
  return `<span class="bm-fallback">${escapeHtml(initials)}</span>`;
}
// Detect whether a favicon has a solid background (e.g. Claude, ChatGPT) vs.
// a transparent logo (e.g. Instagram), and round only the solid ones.
function detectFaviconBackground(img) {
  const check = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const corners = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
      let opaque = 0;
      for (const [x,y] of corners) {
        if (data[(y*w + x)*4 + 3] > 200) opaque++;
      }
      if (opaque >= 3) img.classList.add('has-bg');
    } catch {/* canvas tainted or read failed — leave as-is */}
  };
  if (img.complete && img.naturalWidth) check();
  else img.addEventListener('load', check, { once: true });
}
function processFavicons(root) {
  (root || document).querySelectorAll('img.bm-favicon').forEach(detectFaviconBackground);
}

// ── Context menu ────────────────────────────────────────────
let _ctxMenuEl = null;
function closeContextMenu() {
  if (_ctxMenuEl) { _ctxMenuEl.remove(); _ctxMenuEl = null; }
}
function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  items.forEach(it => {
    if (it.divider) {
      const d = document.createElement('div'); d.className = 'ctx-menu-divider'; menu.appendChild(d); return;
    }
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'ctx-menu-row' + (it.danger ? ' danger' : '');
    row.innerHTML = `${it.icon ? icon(it.icon, 14) : ''}<span>${escapeHtml(it.label)}</span>`;
    row.addEventListener('click', e => {
      e.stopPropagation();
      closeContextMenu();
      it.onClick && it.onClick();
    });
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  // Position with viewport clamping
  const pad = 6;
  const w = menu.offsetWidth || 180;
  const h = menu.offsetHeight || 120;
  const left = Math.min(x, window.innerWidth - w - pad);
  const top  = Math.min(y, window.innerHeight - h - pad);
  menu.style.left = Math.max(pad, left) + 'px';
  menu.style.top  = Math.max(pad, top) + 'px';
  _ctxMenuEl = menu;
}
document.addEventListener('click', closeContextMenu);
document.addEventListener('contextmenu', e => {
  // If user right-clicks outside any registered target, dismiss the menu
  if (!e.target.closest('.ctx-menu') && !e.target.closest('[data-ctx]')) closeContextMenu();
});
window.addEventListener('blur', closeContextMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu(); });

// ── State ────────────────────────────────────────────────────
let categories = [];           // { id, name, color, ... }
let bookmarks  = [];           // { id, title, url, categoryId, pinned? }
let todos      = [];           // { id, text, priority, done, timer }
let notes      = [];           // { id, text, color, pinned, position, size, title? }
let mediaState = null;

// UI state
let openPanelStack = [];        // stack of close-fns for nested panels
let openMenu = null;            // currently-open inline menu (engine, add caret)
let todoFilter = 'all';
let newTodoPriority = 'medium';
let bmDnD = null;               // { kind: 'bookmark'|'folder', id }

// ── Clock + greeting ─────────────────────────────────────────
function greetingText(h) {
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
function fmtDate(d) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
function renderClock() {
  const now = new Date();
  const h24 = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const h12 = ((h24 + 11) % 12) + 1;
  const hStr = String(h12);
  const suf = h24 >= 12 ? 'PM' : 'AM';
  const blink = now.getSeconds() % 2 === 0;
  $('clock').innerHTML =
    `<span>${hStr}</span>` +
    `<span class="colon${blink ? '' : ' dim'}">:</span>` +
    `<span>${m}</span>` +
    `<span class="suffix">${suf}</span>`;
  $('greeting').textContent = greetingText(h24);
  $('today-date').textContent = fmtDate(now);
}

// ── Persistence ──────────────────────────────────────────────
async function saveCats()      { await store.set('orbit_categories', categories); }
async function saveBookmarks() { await store.set('orbit_bookmarks',  bookmarks);  }
async function saveTodos()     { await store.set('orbit_todos',      todos);      }
async function saveNotes()     { await store.set('orbit_notes',      notes);      }

// ── Background / wallpaper (IndexedDB) ───────────────────────
// Curated fallback set used when the Unsplash API is unreachable or
// no access key is configured. Each entry pairs a photo with its author
// so we can still credit them properly.
const DEFAULT_BACKGROUNDS = [
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80', author: 'Eberhard Grossgasteiger', authorUrl: 'https://unsplash.com/@eberhardgross', photoUrl: 'https://unsplash.com/photos/9Xngoyjkzpw' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2400&q=80', author: 'Sergey Pesterev',         authorUrl: 'https://unsplash.com/@sickle',       photoUrl: 'https://unsplash.com/photos/JV78PVf3gGI' },
  { url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=2400&q=80', author: 'Kazuend',                 authorUrl: 'https://unsplash.com/@kazuend',      photoUrl: 'https://unsplash.com/photos/19SC2oaVZW0' },
  { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=2400&q=80', author: 'Bailey Zindel',           authorUrl: 'https://unsplash.com/@baileyzindel',  photoUrl: 'https://unsplash.com/photos/NRQV-hBF10M' },
  { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=2400&q=80', author: 'Lukasz Szmigiel',         authorUrl: 'https://unsplash.com/@szmigieldesign', photoUrl: 'https://unsplash.com/photos/jFCViYFYcus' },
  { url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=2400&q=80', author: 'Jaime Reimer',            authorUrl: 'https://unsplash.com/@jaimereimer',   photoUrl: 'https://unsplash.com/photos/uQDRDqpYJHI' },
  { url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=2400&q=80', author: 'David Marcu',             authorUrl: 'https://unsplash.com/@davidmarcu',    photoUrl: 'https://unsplash.com/photos/78A265wPiO4' },
];

// Set this to a personal Unsplash Access Key (https://unsplash.com/developers)
// to enable the daily nature-wallpaper fetch. Leave empty to use only the
// curated fallback set above.
const UNSPLASH_ACCESS_KEY = '';
const UNSPLASH_UTM = 'utm_source=orbit&utm_medium=referral';
const DAILY_WP_KEY = 'orbit_daily_wp';

// Wallpaper mode + solid-color palette ───────────────────────
// Modes: 'unsplash' (daily nature photo), 'custom' (user upload), 'color' (solid).
const BG_MODE_KEY  = 'orbit_bg_mode';
const BG_COLOR_KEY = 'orbit_bg_color';
const COLOR_PALETTE = [
  '#1F2937', // slate
  '#1E3A8A', // deep navy
  '#0C4A6E', // deep ocean
  '#134E4A', // deep teal
  '#14532D', // forest
  '#3F2A1A', // espresso
  '#78350F', // bronze
  '#7F1D1D', // maroon
  '#831843', // burgundy
  '#4C1D95', // plum
  '#312E81', // deep indigo
  '#0A0A0A', // near-black
];
function getBgMode()   { return localStorage.getItem(BG_MODE_KEY)  || 'unsplash'; }
function getBgColor()  { return localStorage.getItem(BG_COLOR_KEY) || COLOR_PALETTE[0]; }
function setBgMode(m)  { localStorage.setItem(BG_MODE_KEY, m); }
function setBgColor(c) { localStorage.setItem(BG_COLOR_KEY, c); }

function dayBucket() {
  // Local-date day bucket so the wallpaper rolls over at the user's midnight.
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function fetchDailyUnsplash() {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const url = 'https://api.unsplash.com/photos/random'
    + '?query=nature,landscape'
    + '&orientation=landscape'
    + '&content_filter=high'
    + '&client_id=' + encodeURIComponent(UNSPLASH_ACCESS_KEY);
  const res = await fetch(url, { headers: { 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error('unsplash ' + res.status);
  const p = await res.json();
  return {
    url: (p.urls && (p.urls.full || p.urls.regular)) + '&w=2400&q=80',
    author: (p.user && p.user.name) || 'Unknown',
    authorUrl: `https://unsplash.com/@${(p.user && p.user.username) || ''}?${UNSPLASH_UTM}`,
    photoUrl: `${(p.links && p.links.html) || 'https://unsplash.com'}?${UNSPLASH_UTM}`,
  };
}

// Force a new wallpaper fetch right now: re-fetches from Unsplash if a key
// is set, otherwise rotates to the next curated photo. The chosen photo is
// persisted to the day cache so new tabs opened later show the same one
// until the next manual refresh or the day rolls over.
async function refreshWallpaperNow() {
  let photo = null;
  if (UNSPLASH_ACCESS_KEY) {
    try { photo = await fetchDailyUnsplash(); } catch (e) { /* fall through */ }
  }
  if (!photo) {
    let idx = parseInt(localStorage.getItem('orbit_fallback_idx') || '-1', 10);
    idx = (idx + 1) % DEFAULT_BACKGROUNDS.length;
    localStorage.setItem('orbit_fallback_idx', String(idx));
    photo = DEFAULT_BACKGROUNDS[idx];
  }
  // Persist so subsequent new tabs (today) keep this exact photo.
  localStorage.setItem(DAILY_WP_KEY, JSON.stringify({ day: dayBucket(), photo }));
  return photo;
}

async function getDailyBackground() {
  const today = dayBucket();
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(DAILY_WP_KEY) || 'null'); } catch (e) {}
  if (cached && cached.day === today && cached.photo && cached.photo.url) return cached.photo;
  try {
    const photo = await fetchDailyUnsplash();
    if (photo) {
      localStorage.setItem(DAILY_WP_KEY, JSON.stringify({ day: today, photo }));
      return photo;
    }
  } catch (e) { /* network/CORS/etc — fall through to curated set */ }
  // Deterministic pick from the curated set so the same fallback shows all day.
  const idx = Math.floor(Date.now() / 86400000) % DEFAULT_BACKGROUNDS.length;
  return DEFAULT_BACKGROUNDS[idx];
}

function showPhotoCredit(photo) {
  const el = document.getElementById('photo-credit');
  if (!el) return;
  if (!photo || !photo.author) { el.hidden = true; return; }
  const a = document.getElementById('photo-credit-author');
  a.textContent = photo.author;
  a.href = photo.authorUrl || (photo.photoUrl || 'https://unsplash.com');
  document.getElementById('photo-credit-source').href =
    photo.photoUrl || `https://unsplash.com/?${UNSPLASH_UTM}`;
  el.hidden = false;
}
function hidePhotoCredit() {
  const el = document.getElementById('photo-credit');
  if (el) el.hidden = true;
}
const WP_DB = 'orbit', WP_STORE = 'wallpaper';
function wpDbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(WP_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(WP_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function wpGet() {
  const db = await wpDbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(WP_STORE, 'readonly');
    const r = tx.objectStore(WP_STORE).get('current');
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}
async function wpPut(value) {
  const db = await wpDbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).put(value, 'current');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function wpDelete() {
  const db = await wpDbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).delete('current');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

let currentBgObjectUrl = null;
function applyMedia(bg, blobOrUrl, isVideo) {
  bg.innerHTML = '';
  bg.style.backgroundImage = '';
  const src = (typeof blobOrUrl === 'string') ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  if (typeof blobOrUrl !== 'string') {
    if (currentBgObjectUrl) URL.revokeObjectURL(currentBgObjectUrl);
    currentBgObjectUrl = src;
  }
  if (isVideo) {
    const v = document.createElement('video');
    v.src = src; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    v.className = 'bg-video';
    bg.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = src; img.className = 'bg-image'; img.draggable = false;
    bg.appendChild(img);
  }
}
function clearBg(bg) {
  if (currentBgObjectUrl) { URL.revokeObjectURL(currentBgObjectUrl); currentBgObjectUrl = null; }
  bg.innerHTML = '';
  bg.style.backgroundImage = '';
  bg.style.backgroundColor = '';
}

async function setupBackground() {
  const bg = $('bg');
  const mode = getBgMode();

  if (mode === 'color') {
    clearBg(bg);
    bg.style.backgroundColor = getBgColor();
    hidePhotoCredit();
    return;
  }

  if (mode === 'custom') {
    try {
      const wp = await wpGet();
      if (wp && wp.blob) { applyMedia(bg, wp.blob, wp.type === 'video'); hidePhotoCredit(); return; }
    } catch (e) {}
    // No custom blob saved yet — fall through to unsplash as a safe default.
  }

  // Default: daily Unsplash (or curated fallback) with photographer credit.
  clearBg(bg);
  const photo = await getDailyBackground();
  if (photo && photo.url) {
    bg.style.backgroundImage = `url("${photo.url}")`;
    showPhotoCredit(photo);
  } else {
    bg.style.backgroundColor = '#0F172A';
    hidePhotoCredit();
  }
}

// ── Search (with engine selector) ────────────────────────────
const ENGINE_ICON_SRC = {
  google:     'icons/Google.svg',
  duckduckgo: 'icons/Duck Duck Go.svg',
  bing:       'icons/Bing.svg',
  youtube:    'icons/Youtube.svg',
  wikipedia:  'icons/Wiki.svg',
};
const ENGINE_LOGOS = Object.fromEntries(
  Object.entries(ENGINE_ICON_SRC).map(([k, src]) => [
    k,
    `<img class="engine-logo-img" src="${encodeURI(src)}" alt="" draggable="false" />`,
  ])
);
const ENGINES = {
  google:     { name: 'Google',     short: 'G', url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  duckduckgo: { name: 'DuckDuckGo', short: 'D', url: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  bing:       { name: 'Bing',       short: 'B', url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  youtube:    { name: 'YouTube',    short: 'Y', url: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  wikipedia:  { name: 'Wikipedia',  short: 'W', url: q => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` },
};
let currentEngine = 'google';
function setupSearch() {
  currentEngine = localStorage.getItem('orbit_search_engine') || 'google';
  if (!ENGINES[currentEngine]) currentEngine = 'google';
  $('search-engine-icon').innerHTML = ENGINE_LOGOS[currentEngine] || ENGINES[currentEngine].short;

  const menu = $('engine-menu');
  menu.innerHTML = '';
  Object.entries(ENGINES).forEach(([key, e]) => {
    const row = document.createElement('div');
    row.className = 'engine-row' + (key === currentEngine ? ' on' : '');
    row.innerHTML = `<span class="engine-glyph sm">${ENGINE_LOGOS[key] || e.short}</span><span>${e.name}</span>`;
    row.addEventListener('click', ev => {
      ev.stopPropagation();
      currentEngine = key;
      localStorage.setItem('orbit_search_engine', key);
      $('search-engine-icon').innerHTML = ENGINE_LOGOS[key] || e.short;
      menu.classList.add('hidden');
      $('search-input').focus();
      // Re-render to update .on highlight
      setupSearch();
    });
    menu.appendChild(row);
  });

  const btn = $('search-engine-btn');
  btn.onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };

  $('search-form').onsubmit = e => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) return;
    window.location.href = ENGINES[currentEngine].url(q);
  };
}

// ── Top-level pill counts ───────────────────────────────────
function updatePillCounts() {
  const n = notes.length;
  const t = todos.filter(x => !x.done).length;
  const nb = $('notes-count'), tb = $('todo-count');
  if (n > 0) { nb.textContent = n; nb.hidden = false; } else { nb.hidden = true; }
  if (t > 0) { tb.textContent = t; tb.hidden = false; } else { tb.hidden = true; }
}

// Active to-dos peek on the homepage (below Notes/Todo pills)
function lockRowHeight(row) {
  // Snapshot height + spacing so the collapse keyframe animates from the
  // real measured size (handles multi-line text + timer-row variants).
  const cs = getComputedStyle(row);
  row.style.setProperty('--row-h',  row.offsetHeight + 'px');
  row.style.setProperty('--row-mt', cs.marginTop);
  row.style.setProperty('--row-pt', cs.paddingTop);
  row.style.setProperty('--row-pb', cs.paddingBottom);
}

function renderHomeTodos() {
  const host = $('home-todos');
  if (!host) return;
  const active = todos.filter(t => !t.done).slice(0, 6);
  host.innerHTML = '';
  if (active.length === 0) return;
  active.forEach(t => {
    const row = document.createElement('div');
    row.className = 'home-todo';
    row.dataset.id = t.id;
    row.innerHTML = `
      <button type="button" class="home-todo-check" title="Complete"></button>
      <div class="home-todo-body">
        <span class="home-todo-text">${escapeHtml(t.text || '')}</span>
        <span class="home-todo-timer-slot"></span>
      </div>
      ${t.timer ? '' : '<button type="button" class="home-todo-btn home-todo-timer" title="Timer"><i class="ph ph-timer"></i></button>'}
      <button type="button" class="home-todo-btn home-todo-x" title="Delete"><i class="ph ph-trash"></i></button>
    `;
    if (t.timer) {
      const slot = row.querySelector('.home-todo-timer-slot');
      slot.replaceWith(buildTimerRow(t));
    }
    row.querySelector('.home-todo-check').addEventListener('click', e => {
      e.stopPropagation();
      lockRowHeight(row);
      row.classList.add('todo-cutting');
      const onAnim = ev => {
        if (ev.animationName !== 'todoCutCollapse') return;
        row.removeEventListener('animationend', onAnim);
        t.done = true;
        saveTodos();
        renderHomeTodos();
        updatePillCounts();
        const panel = document.querySelector('.panel-overlay[data-panel="todo"]');
        if (panel && panel._refresh) panel._refresh();
      };
      row.addEventListener('animationend', onAnim);
    });
    const setTimerBtn = row.querySelector('.home-todo-timer');
    if (setTimerBtn) {
      setTimerBtn.addEventListener('click', e => {
        e.stopPropagation();
        openTimerSheet(t.id);
      });
    }
    row.querySelector('.home-todo-x').addEventListener('click', e => {
      e.stopPropagation();
      todos = todos.filter(x => x.id !== t.id);
      saveTodos();
      renderHomeTodos();
      updatePillCounts();
      const panel = document.querySelector('.panel-overlay[data-panel="todo"]');
      if (panel && panel._refresh) panel._refresh();
    });
    row.addEventListener('click', e => {
      if (e.target.closest('.home-todo-check, .home-todo-btn, .timer-row')) return;
      openTodoPanel();
    });
    host.appendChild(row);
  });
}

// ── Bookmark drag & drop helpers ─────────────────────────────
function bmDragStart(el, payload) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    bmDnD = payload;
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-orbit', payload.kind + ':' + payload.id);
    } catch (_) {}
    el.classList.add('bm-dragging');
    document.body.classList.add('bm-dragging-active');
  });
  el.addEventListener('dragend', () => {
    bmDnD = null;
    el.classList.remove('bm-dragging');
    document.body.classList.remove('bm-dragging-active');
    document.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after')
      .forEach(n => n.classList.remove('drag-over', 'drag-over-before', 'drag-over-after'));
  });
}

function clearTileMarks(container) {
  container.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after')
    .forEach(n => n.classList.remove('drag-over', 'drag-over-before', 'drag-over-after'));
}

function tileEdge(tileEl, clientX, vertical) {
  const r = tileEl.getBoundingClientRect();
  if (vertical) return clientY => clientY > r.top + r.height / 2 ? 'after' : 'before';
  return clientX > r.left + r.width / 2 ? 'after' : 'before';
}

function moveInArray(arr, item, refItem, after) {
  const filtered = arr.filter(x => x !== item);
  const idx = refItem ? filtered.indexOf(refItem) : filtered.length;
  filtered.splice(after ? idx + 1 : idx, 0, item);
  return filtered;
}

// Top-level row DnD: reorder bookmarks/folders, drop bookmark on folder = move in.
function setupRowDnD(row) {
  row.addEventListener('dragover', e => {
    if (!bmDnD) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const tile = e.target.closest('.dock-item');
    clearTileMarks(row);
    if (!tile) return;
    if (bmDnD.kind === 'bookmark' && tile.dataset.folderId) {
      tile.classList.add('drag-over');
      return;
    }
    if (bmDnD.kind === 'bookmark' && tile.dataset.bookmarkId && tile.dataset.bookmarkId !== bmDnD.id) {
      tile.classList.add(tileEdge(tile, e.clientX) === 'after' ? 'drag-over-after' : 'drag-over-before');
    } else if (bmDnD.kind === 'folder' && tile.dataset.folderId && tile.dataset.folderId !== bmDnD.id) {
      tile.classList.add(tileEdge(tile, e.clientX) === 'after' ? 'drag-over-after' : 'drag-over-before');
    }
  });
  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) clearTileMarks(row);
  });
  row.addEventListener('drop', e => {
    if (!bmDnD) return;
    e.preventDefault();
    const tile = e.target.closest('.dock-item');
    clearTileMarks(row);

    if (bmDnD.kind === 'bookmark') {
      const bm = bookmarks.find(b => b.id === bmDnD.id);
      if (!bm) return;
      if (tile && tile.dataset.folderId) {
        if (bm.categoryId === tile.dataset.folderId) return;
        bm.categoryId = tile.dataset.folderId;
        saveBookmarks(); renderBookmarks();
        return;
      }
      bm.categoryId = null;
      let target = null, after = false;
      if (tile && tile.dataset.bookmarkId && tile.dataset.bookmarkId !== bm.id) {
        target = bookmarks.find(b => b.id === tile.dataset.bookmarkId);
        after = tileEdge(tile, e.clientX) === 'after';
      }
      bookmarks = moveInArray(bookmarks, bm, target, after);
      saveBookmarks(); renderBookmarks();
    } else if (bmDnD.kind === 'folder') {
      if (!tile || !tile.dataset.folderId || tile.dataset.folderId === bmDnD.id) return;
      const cat = categories.find(c => c.id === bmDnD.id);
      const target = categories.find(c => c.id === tile.dataset.folderId);
      if (!cat || !target) return;
      const after = tileEdge(tile, e.clientX) === 'after';
      categories = moveInArray(categories, cat, target, after);
      saveCats(); renderBookmarks();
    }
  });
}

// ── Bookmarks row (Hexa dock-wrap) ───────────────────────────
function renderBookmarks() {
  const row = $('bookmarks-row');
  row.innerHTML = '';
  if (!row.dataset.dndReady) { setupRowDnD(row); row.dataset.dndReady = '1'; }
  const topLevel = bookmarks.filter(b => !b.categoryId || !categories.find(c => c.id === b.categoryId));

  // Top-level bookmark tiles (rendered first, before folders)
  topLevel.forEach(bm => {
    const a = document.createElement('a');
    a.className = 'dock-item';
    a.href = bm.url;
    a.rel = 'noreferrer';
    a.dataset.bookmarkId = bm.id;
    a.innerHTML = `
      <span class="dock-icon dock-icon-fav">${bookmarkIconHtml(bm, 32)}</span>
      <span class="dock-label">${escapeHtml(bm.title || bm.url)}</span>
    `;
    a.dataset.ctx = 'bookmark';
    a.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Edit',   icon: 'edit',  onClick: () => openBookmarkSheet({ edit: bm }) },
        { label: 'Delete', icon: 'trash', danger: true, onClick: () => {
            bookmarks = bookmarks.filter(x => x.id !== bm.id);
            saveBookmarks(); renderBookmarks();
        }},
      ]);
    });
    bmDragStart(a, { kind: 'bookmark', id: bm.id });
    row.appendChild(a);
  });

  // Folder tiles (rendered after bookmarks)
  categories.forEach(cat => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'dock-item';
    tile.dataset.folderId = cat.id;
    const color = resolveColor(cat.color);
    tile.innerHTML = `
      <span class="dock-icon dock-icon-folder">${icon('folder-fill', 26)}</span>
      <span class="dock-label">${escapeHtml(cat.name)}</span>
    `;
    tile.querySelector('.dock-icon-folder').style.backgroundColor = color;
    tile.addEventListener('click', () => openFolderPanel(cat.id));
    tile.dataset.ctx = 'folder';
    tile.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Edit',   icon: 'edit',  onClick: () => openFolderSheet({ edit: cat }) },
        { label: 'Delete', icon: 'trash', danger: true, onClick: async () => {
            const ok = await customConfirm({
              title: `Delete folder "${cat.name}"?`,
              message: 'Bookmarks inside will move to top level.',
              confirmLabel: 'Delete folder',
              danger: true,
            });
            if (!ok) return;
            bookmarks.forEach(b => { if (b.categoryId === cat.id) b.categoryId = null; });
            categories = categories.filter(c => c.id !== cat.id);
            saveCats(); saveBookmarks(); renderBookmarks();
        }},
      ]);
    });
    bmDragStart(tile, { kind: 'folder', id: cat.id });
    row.appendChild(tile);
  });

  if (categories.length === 0 && topLevel.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dock-empty';
    empty.innerHTML = `<span>No bookmarks yet.</span>`;
    row.appendChild(empty);
  }
  processFavicons(row);
}

// ── Add menu (split CTA caret) ──────────────────────────────
function toggleAddMenu(forceState) {
  const group = $('add-cta-group');
  let menu = group.querySelector('.add-menu');
  const open = forceState !== undefined ? forceState : !menu;
  if (!open) {
    if (menu) menu.remove();
    const scrim = group.querySelector('.add-menu-scrim');
    if (scrim) scrim.remove();
    return;
  }
  if (menu) return;
  const scrim = document.createElement('div');
  scrim.className = 'add-menu-scrim';
  scrim.addEventListener('click', () => toggleAddMenu(false));
  group.appendChild(scrim);

  menu = document.createElement('div');
  menu.className = 'add-menu';
  menu.innerHTML = `
    <div class="add-menu-row" data-action="bookmark">
      ${icon('bookmark', 14)}
      <div><strong>New bookmark</strong><span>Save a link</span></div>
    </div>
    <div class="add-menu-row" data-action="folder">
      ${icon('folder', 14)}
      <div><strong>New folder</strong><span>Group bookmarks</span></div>
    </div>
  `;
  menu.addEventListener('click', e => {
    const row = e.target.closest('.add-menu-row');
    if (!row) return;
    toggleAddMenu(false);
    if (row.dataset.action === 'bookmark') openBookmarkSheet();
    else openFolderSheet();
  });
  group.appendChild(menu);
}

// ── Confirm dialog (in-app, branded) ─────────────────────────
function customConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const host = $('panel-host');
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const card = document.createElement('div');
    card.className = 'confirm-card';
    card.innerHTML = `
      <div class="confirm-title"></div>
      <div class="confirm-message"></div>
      <div class="confirm-actions">
        <button type="button" class="sheet-btn ghost outlined" data-act="cancel"></button>
        <button type="button" class="sheet-btn ghost outlined${danger ? ' danger' : ''}" data-act="ok"></button>
      </div>
    `;
    card.querySelector('.confirm-title').textContent   = title;
    card.querySelector('.confirm-message').textContent = message;
    card.querySelector('[data-act=cancel]').textContent = cancelLabel;
    card.querySelector('[data-act=ok]').textContent     = confirmLabel;

    const close = (value) => {
      overlay.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      if (e.key === 'Enter')  { e.preventDefault(); close(true);  }
    };

    card.querySelector('[data-act=cancel]').addEventListener('click', () => close(false));
    card.querySelector('[data-act=ok]').addEventListener('click',     () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    overlay.tabIndex = -1;
    overlay.addEventListener('keydown', onKey);
    overlay.appendChild(card);
    host.appendChild(overlay);
    setTimeout(() => {
      overlay.focus();
      card.querySelector('[data-act=ok]').focus();
    }, 0);
  });
}

// ── Panel helper ─────────────────────────────────────────────
function openPanel({ title, subtitle, side = 'right', headerActions = null, render, onClose }) {
  const host = $('panel-host');
  const overlay = document.createElement('div');
  overlay.className = `panel-overlay panel-${side}`;
  const panel = document.createElement('div');
  panel.className = `panel panel-side-${side}`;
  panel.addEventListener('click', e => e.stopPropagation());

  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `
    <div>
      <h2></h2>
      <p></p>
    </div>
    <div class="panel-head-actions"></div>
  `;
  head.querySelector('h2').textContent = title || '';
  head.querySelector('p').textContent = subtitle || '';
  const actions = head.querySelector('.panel-head-actions');
  if (headerActions) actions.appendChild(headerActions);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ghost-btn';
  closeBtn.innerHTML = icon('close', 16);
  actions.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'panel-body';

  panel.appendChild(head);
  panel.appendChild(body);
  overlay.appendChild(panel);
  host.appendChild(overlay);
  document.body.classList.add('panel-open');

  const close = () => {
    overlay.remove();
    openPanelStack = openPanelStack.filter(c => c !== close);
    if (openPanelStack.length === 0) document.body.classList.remove('panel-open');
    if (onClose) onClose();
  };
  overlay.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  openPanelStack.push(close);

  if (render) render(body, { close, setSubtitle: t => { head.querySelector('p').textContent = t || ''; } });
  return { close, body, head };
}

function closeTopPanel() {
  const last = openPanelStack[openPanelStack.length - 1];
  if (last) last();
}

// ── New bookmark sheet ──────────────────────────────────────
function openBookmarkSheet({ folderId = null, edit = null } = {}) {
  const isEdit = !!edit;
  let form = isEdit
    ? { name: edit.title || '', url: edit.url || '', color: edit.color || PALETTE[0], folderId: edit.categoryId || null }
    : { name: '', url: '', color: PALETTE[0], folderId };
  openPanel({
    title: isEdit ? 'Edit bookmark' : 'New bookmark',
    subtitle: isEdit ? 'Update this link' : 'Save a link to your dock',
    side: 'center',
    render(body, { close }) {
      const f = document.createElement('form');
      f.className = 'sheet-form';
      f.innerHTML = `
        <label class="sheet-label">Name</label>
        <input class="sheet-input" type="text" name="name" placeholder="e.g. Notion" autofocus />
        <label class="sheet-label">URL</label>
        <input class="sheet-input" type="text" name="url" placeholder="notion.so" />
        <label class="sheet-label">Folder</label>
        <div class="folder-pill-row"></div>
        <label class="sheet-label">Color</label>
        <div class="color-row"></div>
        <div class="sheet-footer">
          <button type="button" class="sheet-btn ghost" data-act="cancel">Cancel</button>
          <button type="submit" class="sheet-btn primary">${isEdit ? 'Save changes' : 'Add bookmark'}</button>
        </div>
      `;
      body.appendChild(f);
      if (isEdit) {
        f.querySelector('[name=name]').value = form.name;
        f.querySelector('[name=url]').value  = form.url;
      }

      // Folder pills
      const pillRow = f.querySelector('.folder-pill-row');
      const renderPills = () => {
        pillRow.innerHTML = '';
        const top = document.createElement('button');
        top.type = 'button';
        top.className = 'folder-pill' + (!form.folderId ? ' on' : '');
        top.textContent = 'Top level';
        top.addEventListener('click', () => { form.folderId = null; renderPills(); });
        pillRow.appendChild(top);
        categories.forEach(c => {
          const p = document.createElement('button');
          p.type = 'button';
          p.className = 'folder-pill' + (form.folderId === c.id ? ' on' : '');
          p.innerHTML = `<span class="folder-pill-dot"></span>${escapeHtml(c.name)}`;
          p.querySelector('.folder-pill-dot').style.backgroundColor = resolveColor(c.color);
          p.addEventListener('click', () => { form.folderId = c.id; renderPills(); });
          pillRow.appendChild(p);
        });
        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = 'folder-pill new';
        newBtn.innerHTML = `${icon('plus', 11)} New folder`;
        newBtn.addEventListener('click', () => { close(); openFolderSheet(); });
        pillRow.appendChild(newBtn);
      };
      renderPills();

      // Color swatches
      const colorRow = f.querySelector('.color-row');
      const renderSwatches = () => {
        colorRow.innerHTML = '';
        PALETTE.forEach(c => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'swatch' + (form.color === c ? ' on' : '');
          sw.style.background = c;
          sw.addEventListener('click', () => { form.color = c; renderSwatches(); });
          colorRow.appendChild(sw);
        });
      };
      renderSwatches();

      f.querySelector('[name=name]').addEventListener('input', e => form.name = e.target.value);
      f.querySelector('[name=url]').addEventListener('input',  e => form.url  = e.target.value);
      f.querySelector('[data-act=cancel]').addEventListener('click', close);
      f.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.name.trim() || !form.url.trim()) return;
        let url = form.url.trim();
        if (!/^https?:\/\//.test(url)) url = 'https://' + url;
        if (isEdit) {
          edit.title = form.name.trim();
          edit.url = url;
          edit.color = form.color;
          edit.categoryId = form.folderId;
        } else {
          bookmarks.push({
            id: uid(),
            title: form.name.trim(),
            url,
            color: form.color,
            categoryId: form.folderId,
          });
        }
        saveBookmarks();
        renderBookmarks();
        close();
      });
      setTimeout(() => f.querySelector('[name=name]').focus(), 30);
    }
  });
}

// ── New folder sheet ────────────────────────────────────────
function openFolderSheet({ edit = null } = {}) {
  const isEdit = !!edit;
  let form = isEdit
    ? { name: edit.name || '', color: edit.color || PALETTE[1] }
    : { name: '', color: PALETTE[1] };
  openPanel({
    title: isEdit ? 'Edit folder' : 'New folder',
    subtitle: isEdit ? 'Rename or recolor' : 'Group related bookmarks',
    side: 'center',
    render(body, { close }) {
      const f = document.createElement('form');
      f.className = 'sheet-form';
      f.innerHTML = `
        <label class="sheet-label">Folder name</label>
        <input class="sheet-input" type="text" name="name" placeholder="e.g. Streaming" autofocus />
        <label class="sheet-label">Color</label>
        <div class="color-row"></div>
        <div class="sheet-footer">
          <button type="button" class="sheet-btn ghost" data-act="cancel">Cancel</button>
          <button type="submit" class="sheet-btn primary">${isEdit ? 'Save changes' : 'Create folder'}</button>
        </div>
      `;
      body.appendChild(f);
      if (isEdit) f.querySelector('[name=name]').value = form.name;
      const colorRow = f.querySelector('.color-row');
      const renderSwatches = () => {
        colorRow.innerHTML = '';
        PALETTE.forEach(c => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'swatch' + (form.color === c ? ' on' : '');
          sw.style.background = c;
          sw.addEventListener('click', () => { form.color = c; renderSwatches(); });
          colorRow.appendChild(sw);
        });
      };
      renderSwatches();
      f.querySelector('[name=name]').addEventListener('input', e => form.name = e.target.value);
      f.querySelector('[data-act=cancel]').addEventListener('click', close);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const name = form.name.trim();
        if (!name) return;
        if (isEdit) {
          edit.name = name;
          edit.color = form.color;
        } else {
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uid().slice(0, 4);
          categories.push({ id, name, color: form.color });
        }
        saveCats();
        renderBookmarks();
        close();
      });
      setTimeout(() => f.querySelector('[name=name]').focus(), 30);
    }
  });
}

// ── Folder panel (center) ───────────────────────────────────
function openFolderPanel(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  const headerActions = document.createElement('div');
  headerActions.style.display = 'contents';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'panel-head-cta';
  addBtn.title = 'Add bookmark';
  addBtn.innerHTML = `${icon('plus', 14)}<span>Add bookmark</span>`;
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'panel-head-action danger';
  delBtn.title = 'Delete folder';
  delBtn.innerHTML = icon('trash', 16);
  headerActions.appendChild(addBtn);
  headerActions.appendChild(delBtn);

  const panel = openPanel({
    title: cat.name,
    subtitle: '',
    side: 'center',
    headerActions,
    render(body, { setSubtitle, close }) {
      const outZone = document.createElement('div');
      outZone.className = 'folder-out-zone';
      outZone.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg><span>Drop here to move out of folder</span>`;
      body.appendChild(outZone);

      const grid = document.createElement('div');
      grid.className = 'folder-grid-5';
      body.appendChild(grid);

      outZone.addEventListener('dragover', e => {
        if (!bmDnD || bmDnD.kind !== 'bookmark') return;
        const bm = bookmarks.find(b => b.id === bmDnD.id);
        if (!bm || bm.categoryId !== cat.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        outZone.classList.add('on');
      });
      outZone.addEventListener('dragleave', () => outZone.classList.remove('on'));
      outZone.addEventListener('drop', e => {
        if (!bmDnD || bmDnD.kind !== 'bookmark') return;
        e.preventDefault();
        outZone.classList.remove('on');
        const bm = bookmarks.find(b => b.id === bmDnD.id);
        if (!bm) return;
        bm.categoryId = null;
        saveBookmarks(); renderBookmarks(); renderGrid();
      });

      grid.addEventListener('dragover', e => {
        if (!bmDnD || bmDnD.kind !== 'bookmark') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const tile = e.target.closest('.folder-tile');
        clearTileMarks(grid);
        if (tile && tile.dataset.bookmarkId && tile.dataset.bookmarkId !== bmDnD.id) {
          tile.classList.add(tileEdge(tile, e.clientX) === 'after' ? 'drag-over-after' : 'drag-over-before');
        }
      });
      grid.addEventListener('dragleave', e => {
        if (!grid.contains(e.relatedTarget)) clearTileMarks(grid);
      });
      grid.addEventListener('drop', e => {
        if (!bmDnD || bmDnD.kind !== 'bookmark') return;
        e.preventDefault();
        clearTileMarks(grid);
        const bm = bookmarks.find(b => b.id === bmDnD.id);
        if (!bm) return;
        bm.categoryId = cat.id;
        const tile = e.target.closest('.folder-tile');
        let target = null, after = false;
        if (tile && tile.dataset.bookmarkId && tile.dataset.bookmarkId !== bm.id) {
          target = bookmarks.find(b => b.id === tile.dataset.bookmarkId);
          after = tileEdge(tile, e.clientX) === 'after';
        }
        bookmarks = moveInArray(bookmarks, bm, target, after);
        saveBookmarks(); renderBookmarks(); renderGrid();
      });

      const renderGrid = () => {
        const inside = bookmarks.filter(b => b.categoryId === cat.id);
        setSubtitle(`${inside.length} bookmark${inside.length === 1 ? '' : 's'}`);
        grid.innerHTML = '';
        if (inside.length === 0) {
          const e = document.createElement('div');
          e.className = 'empty folder-empty-span';
          e.innerHTML = `${icon('bookmark', 28)}<p>No bookmarks here yet.</p>`;
          grid.appendChild(e);
        }
        inside.forEach(bm => {
          const a = document.createElement('a');
          a.className = 'folder-tile';
          a.href = bm.url;
          a.rel = 'noreferrer';
          a.dataset.bookmarkId = bm.id;
          a.innerHTML = `
            <span class="folder-tile-icon folder-tile-icon-fav">${bookmarkIconHtml(bm, 36)}</span>
            <span class="folder-tile-label">${escapeHtml(bm.title || bm.url)}</span>
          `;
          a.dataset.ctx = 'bookmark';
          a.addEventListener('contextmenu', e => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, [
              { label: 'Edit',   icon: 'edit',  onClick: () => { close(); openBookmarkSheet({ edit: bm }); } },
              { label: 'Delete', icon: 'trash', danger: true, onClick: () => {
                  bookmarks = bookmarks.filter(x => x.id !== bm.id);
                  saveBookmarks(); renderBookmarks(); renderGrid();
              }},
            ]);
          });
          bmDragStart(a, { kind: 'bookmark', id: bm.id });
          grid.appendChild(a);
        });
        processFavicons(grid);
      };
      renderGrid();

      addBtn.addEventListener('click', () => { close(); openBookmarkSheet({ folderId: cat.id }); });
      delBtn.addEventListener('click', async () => {
        const ok = await customConfirm({
          title: `Delete folder "${cat.name}"?`,
          message: 'Bookmarks inside will move to top level.',
          confirmLabel: 'Delete folder',
          danger: true,
        });
        if (!ok) return;
        bookmarks.forEach(b => { if (b.categoryId === cat.id) b.categoryId = null; });
        categories = categories.filter(c => c.id !== cat.id);
        saveCats(); saveBookmarks(); renderBookmarks();
        close();
      });
    }
  });
  return panel;
}

// ── Notes panel (right) ─────────────────────────────────────
const NOTE_COLORS = [
  { key: 'yellow', bg: '#FFF6C7', fg: '#3B2A07' },
  { key: 'pink',   bg: '#FED7D7', fg: '#4A1A1A' },
  { key: 'green',  bg: '#C4F1D2', fg: '#0F2C1B' },
  { key: 'blue',   bg: '#CFE6FF', fg: '#0A2238' },
  { key: 'purple', bg: '#EADCFF', fg: '#241040' },
  { key: 'peach',  bg: '#FFE4C4', fg: '#3D2010' },
];
function noteColorIdx(key) {
  const i = NOTE_COLORS.findIndex(c => c.key === key);
  return i < 0 ? 0 : i;
}

function syncNoteCards(note, srcCard) {
  const all = document.querySelectorAll('.note');
  all.forEach(other => {
    if (other === srcCard || other.dataset.id !== note.id) return;
    const t = other.querySelector('.note-title');
    if (t && t.value !== (note.title || '')) t.value = note.title || '';
    const ta = other.querySelector('textarea');
    if (ta && ta.value !== (note.text || '')) {
      ta.value = note.text || '';
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
    const foot = other.querySelector('.note-foot');
    if (foot && note.ts) {
      foot.textContent = new Date(note.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  });
}

function buildNoteCard(note, { floating = false } = {}) {
  const idx = noteColorIdx(note.color || 'yellow');
  const c = NOTE_COLORS[idx];
  const card = document.createElement('div');
  card.className = 'note' + (note.pinned ? ' pinned' : '');
  card.style.background = c.bg;
  card.style.color = c.fg;
  card.dataset.id = note.id;
  card.innerHTML = `
    <div class="note-head">
      <button type="button" class="note-icon-btn" title="Pin" data-act="pin"><i class="ph ${note.pinned ? 'ph-push-pin-slash' : 'ph-push-pin'}"></i></button>
      <div class="note-colors"></div>
      <button type="button" class="note-icon-btn trash" title="Delete" data-act="del"><i class="ph ph-trash"></i></button>
    </div>
    <input class="note-title" type="text" placeholder="Title" value="${escapeHtml(note.title || '')}" />
    <textarea placeholder="Write something…">${escapeHtml(note.text || '')}</textarea>
    <div class="note-foot"></div>
  `;
  const swRow = card.querySelector('.note-colors');
  NOTE_COLORS.forEach((cc, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'mini-swatch' + (i === idx ? ' on' : '');
    s.style.background = cc.bg;
    s.addEventListener('click', e => {
      e.stopPropagation();
      note.color = cc.key;
      saveNotes();
      renderNotes();
      // Re-render the grid section caller will handle full repaint
      const gridPanel = card.closest('.notes-grid');
      if (gridPanel) rebuildNotesGrid(gridPanel);
    });
    swRow.appendChild(s);
  });
  card.querySelector('[data-act=pin]').addEventListener('click', e => {
    e.stopPropagation();
    note.pinned = !note.pinned;
    if (note.pinned) {
      if (!note.position || typeof note.position.x !== 'number') {
        const pinnedCount = notes.filter(n => n.pinned).length;
        note.position = { x: 60 + (pinnedCount % 3) * 260, y: 120 + Math.floor(pinnedCount / 3) * 220 };
      }
      if (!note.size || typeof note.size.w !== 'number') note.size = { w: 240, h: 200 };
    }
    saveNotes(); renderNotes();
    const gridPanel = card.closest('.notes-grid');
    if (gridPanel) rebuildNotesGrid(gridPanel);
  });
  card.querySelector('[data-act=del]').addEventListener('click', async e => {
    e.stopPropagation();
    const ok = await customConfirm({
      title: 'Delete this note?',
      message: 'This sticky note will be permanently removed.',
      confirmLabel: 'Delete note',
      danger: true,
    });
    if (!ok) return;
    notes = notes.filter(n => n.id !== note.id);
    saveNotes(); renderNotes();
    const gridPanel = card.closest('.notes-grid');
    if (gridPanel) rebuildNotesGrid(gridPanel);
  });
  const titleEl = card.querySelector('.note-title');
  titleEl.style.color = c.fg;
  titleEl.addEventListener('input', () => {
    note.title = titleEl.value;
    note.ts = Date.now();
    saveNotes();
    syncNoteCards(note, card);
  });
  titleEl.addEventListener('mousedown', e => e.stopPropagation());
  const ta = card.querySelector('textarea');
  ta.style.color = c.fg;
  const autoSize = () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };
  ta.addEventListener('input', () => {
    note.text = ta.value;
    note.ts = Date.now();
    autoSize();
    saveNotes();
    updatePillCounts();
    syncNoteCards(note, card);
  });
  ta.addEventListener('mousedown', e => e.stopPropagation());
  // Initial size after the card is in the DOM
  requestAnimationFrame(autoSize);
  card.querySelector('.note-foot').textContent =
    note.ts
      ? new Date(note.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
  card.querySelector('.note-foot').style.color = c.fg;
  card.querySelector('.note-foot').style.opacity = '0.55';

  if (floating) {
    attachNoteDrag(card, note);
    attachNoteResize(card, note);
  }
  return card;
}
// Expose so legacy code paths in renderNotes can pick it up
window.buildNoteCard = buildNoteCard;

function rebuildNotesGrid(gridEl) {
  gridEl.innerHTML = '';
  // Newest first — new notes always appear at the top
  const sorted = [...notes].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (sorted.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.innerHTML = `${icon('note', 28)}<p>No notes yet. Capture a thought.</p>`;
    gridEl.appendChild(e);
    return;
  }
  sorted.forEach(n => gridEl.appendChild(buildNoteCard(n)));
}

function openNotesPanel() {
  // Toggle: if already open, close it
  const existing = document.querySelector('.panel-overlay[data-panel="notes"]');
  if (existing) {
    if (existing._closeFn) existing._closeFn();
    return;
  }

  const p = openPanel({
    title: 'Notes',
    subtitle: `${notes.length} saved`,
    side: 'right',
    render(body, { setSubtitle, close }) {
      body.parentElement.parentElement.dataset.panel = 'notes';
      body.parentElement.parentElement._closeFn = close;

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'panel-add';
      addBtn.innerHTML = `${icon('plus', 14)} New note`;
      body.appendChild(addBtn);

      const grid = document.createElement('div');
      grid.className = 'notes-grid';
      body.appendChild(grid);

      const refresh = () => {
        setSubtitle(`${notes.length} saved`);
        rebuildNotesGrid(grid);
      };
      refresh();
      addBtn.addEventListener('click', () => {
        const n = { id: uid(), text: '', color: 'yellow', pinned: false, ts: Date.now() };
        notes.unshift(n);
        saveNotes();
        refresh();
        renderNotes();
        updatePillCounts();
        // Focus the new textarea
        setTimeout(() => {
          const first = grid.querySelector('.note textarea');
          if (first) first.focus();
        }, 30);
      });

      // Re-render hook for swatch/pin/delete clicks
      grid.addEventListener('click', () => {
        // Subtitle re-sync after note count changes
        setSubtitle(`${notes.length} saved`);
      });
    },
  });
  p.head.parentElement.dataset.panel = 'notes';
}

// ── Floating pinned notes (on wallpaper layer) ──────────────
function renderNotes() {
  const layer = $('pinned-notes-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const visible = notes.filter(n => n.pinned);
  const vw = window.innerWidth, vh = window.innerHeight;
  visible.forEach((n, i) => {
    if (!n.size || typeof n.size.w !== 'number') n.size = { w: 260, h: 280 };
    // Clamp size to current viewport so notes stay usable on small screens
    n.size.w = Math.max(240, Math.min(n.size.w, vw - 16));
    n.size.h = Math.max(260, Math.min(n.size.h, vh - 16));
    if (!n.position || typeof n.position.x !== 'number') {
      n.position = { x: 60 + (i % 3) * 260, y: 120 + Math.floor(i / 3) * 220 };
    }
    // Clamp position so notes can't end up off-screen after resize
    n.position.x = Math.max(4, Math.min(vw - n.size.w - 4, n.position.x));
    n.position.y = Math.max(4, Math.min(vh - n.size.h - 4, n.position.y));
    const card = buildNoteCard(n, { floating: true });
    card.style.left = n.position.x + 'px';
    card.style.top  = n.position.y + 'px';
    card.style.width  = n.size.w + 'px';
    card.style.minHeight = n.size.h + 'px';
    layer.appendChild(card);
  });
  updatePillCounts();
}
// Re-clamp on viewport changes (debounced)
let _notesResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_notesResizeTimer);
  _notesResizeTimer = setTimeout(() => {
    if (notes.some(n => n.pinned)) { renderNotes(); saveNotes(); }
  }, 120);
});

function attachNoteResize(card, note) {
  const handle = document.createElement('div');
  handle.className = 'note-resize';
  card.appendChild(handle);
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startW = card.offsetWidth, startH = card.offsetHeight;
    card.classList.add('resizing');
    const onMove = ev => {
      const w = Math.max(240, Math.min(window.innerWidth  - note.position.x - 8, startW + (ev.clientX - startX)));
      const h = Math.max(220, Math.min(window.innerHeight - note.position.y - 8, startH + (ev.clientY - startY)));
      card.style.width = w + 'px';
      card.style.minHeight = h + 'px';
      note.size.w = w; note.size.h = h;
    };
    const onUp = () => {
      card.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveNotes();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
function attachNoteDrag(card, note) {
  card.addEventListener('mousedown', e => {
    if (e.target.closest('button, textarea, input, .note-resize, .note-icon-btn, .mini-swatch, [contenteditable]')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origX = note.position.x, origY = note.position.y;
    const w = card.offsetWidth, h = card.offsetHeight;
    let curX = origX, curY = origY;
    let moved = false;
    let pending = false;
    let lastEv = null;
    card.classList.add('dragging');
    card.style.willChange = 'transform';
    const flush = () => {
      pending = false;
      if (!lastEv) return;
      const dx = lastEv.clientX - startX;
      const dy = lastEv.clientY - startY;
      curX = Math.max(4, Math.min(window.innerWidth  - w - 4, origX + dx));
      curY = Math.max(4, Math.min(window.innerHeight - h - 4, origY + dy));
      card.style.transform = `translate3d(${curX - origX}px, ${curY - origY}px, 0)`;
    };
    const onMove = ev => {
      lastEv = ev;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) + Math.abs(dy) > 3)) moved = true;
      if (pending) return;
      pending = true;
      requestAnimationFrame(flush);
    };
    const onUp = () => {
      card.classList.remove('dragging');
      card.style.transform = '';
      card.style.willChange = '';
      card.style.left = curX + 'px';
      card.style.top  = curY + 'px';
      note.position.x = curX; note.position.y = curY;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) saveNotes();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── To-do panel ─────────────────────────────────────────────
const PRIO_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' };
function cyclePriority(p) {
  return p === 'high' ? 'medium' : p === 'medium' ? 'low' : 'high';
}

function openTodoPanel() {
  const existing = document.querySelector('.panel-overlay[data-panel="todo"]');
  if (existing) {
    // Already open → close it (toggle behavior on second pill click)
    const closeFn = existing._closeFn;
    if (closeFn) closeFn();
    return;
  }

  const p = openPanel({
    title: 'To-do',
    subtitle: '',
    side: 'right',
    render(body, { setSubtitle, close }) {
      body.parentElement.parentElement.dataset.panel = 'todo';
      body.parentElement.parentElement._closeFn = close;

      const progressWrap = document.createElement('div');
      progressWrap.className = 'todo-progress';
      progressWrap.innerHTML = `<div class="todo-progress-bar"><div></div></div><span>0%</span>`;
      body.appendChild(progressWrap);

      // Add row (Enter submits — no submit button)
      const addForm = document.createElement('form');
      addForm.className = 'todo-add';
      addForm.innerHTML = `
        <input type="text" placeholder="Add a task…" />
        <button type="submit" class="todo-add-cta" title="Add task"><i class="ph ph-plus"></i></button>
      `;
      body.appendChild(addForm);
      addForm.addEventListener('submit', e => {
        e.preventDefault();
        const input = addForm.querySelector('input');
        const text = input.value.trim();
        if (!text) return;
        todos.unshift({ id: uid(), text, priority: newTodoPriority, done: false, ts: Date.now() });
        input.value = '';
        saveTodos();
        refresh();
        renderNotes(); // pill count update
        renderHomeTodos();
        updatePillCounts();
      });

      // Tabs
      const tabsRow = document.createElement('div');
      tabsRow.className = 'todo-tabs';
      body.appendChild(tabsRow);

      const list = document.createElement('div');
      list.className = 'todo-list';
      body.appendChild(list);

      const refresh = () => {
        const done = todos.filter(t => t.done).length;
        const open = todos.length - done;
        const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
        progressWrap.querySelector('.todo-progress-bar > div').style.width = `${pct}%`;
        progressWrap.querySelector('span').textContent = `${pct}%`;
        setSubtitle(`${open} open · ${done} done`);

        // tabs
        tabsRow.innerHTML = '';
        const filters = [
          { id: 'all',    label: 'All',    n: todos.length },
          { id: 'active', label: 'Active', n: open },
          { id: 'done',   label: 'Done',   n: done },
        ];
        filters.forEach(f => {
          const t = document.createElement('button');
          t.type = 'button';
          t.className = 'tab' + (todoFilter === f.id ? ' on' : '');
          t.innerHTML = `${f.label}<span class="tab-count">${f.n}</span>`;
          t.addEventListener('click', () => { todoFilter = f.id; refresh(); });
          tabsRow.appendChild(t);
        });
        if (done > 0) {
          const clr = document.createElement('button');
          clr.type = 'button';
          clr.className = 'clear-link';
          clr.textContent = 'Clear done';
          clr.addEventListener('click', () => {
            todos = todos.filter(t => !t.done);
            saveTodos();
            refresh();
            updatePillCounts();
          });
          tabsRow.appendChild(clr);
        }

        // list
        list.innerHTML = '';
        const filtered = todos.filter(t =>
          todoFilter === 'all' ? true : todoFilter === 'active' ? !t.done : t.done);
        if (filtered.length === 0) {
          const e = document.createElement('div');
          e.className = 'empty';
          const msg = todoFilter === 'done' ? 'Nothing completed yet.'
                    : todoFilter === 'active' ? 'All caught up!'
                    : 'No tasks. Add one above.';
          e.innerHTML = `${icon('check', 28)}<p>${msg}</p>`;
          list.appendChild(e);
          return;
        }
        filtered.forEach(t => list.appendChild(buildTodoRow(t, refresh)));
      };
      refresh();
      // Expose refresh so timer mutations elsewhere can repaint in place
      body.parentElement.parentElement._refresh = refresh;
    }
  });
  p.head.parentElement.dataset.panel = 'todo';
}

function buildTodoRow(t, refresh) {
  const row = document.createElement('div');
  row.className = 'todo' + (t.done ? ' done' : '');
  row.innerHTML = `
    <button type="button" class="check">${t.done ? icon('check', 12) : ''}</button>
    <div class="todo-body"></div>
    <button type="button" class="todo-timer-btn" title="Timer"><i class="ph ph-timer"></i></button>
    <button type="button" class="todo-x" title="Delete"><i class="ph ph-trash"></i></button>
  `;
  // Body: read-only text + (optional) timer row
  const bodyEl = row.querySelector('.todo-body');
  const textEl = document.createElement('div');
  textEl.className = 'todo-text';
  textEl.textContent = t.text || '';
  bodyEl.appendChild(textEl);
  if (t.timer) bodyEl.appendChild(buildTimerRow(t));

  row.querySelector('.check').addEventListener('click', () => {
    if (!t.done) {
      // Animate the cut, then commit when the collapse phase ends
      lockRowHeight(row);
      row.classList.add('todo-cutting');
      const onAnim = ev => {
        if (ev.animationName !== 'todoCutCollapse') return;
        row.removeEventListener('animationend', onAnim);
        t.done = true;
        saveTodos();
        if (refresh) refresh();
        renderHomeTodos();
        updatePillCounts();
      };
      row.addEventListener('animationend', onAnim);
    } else {
      t.done = false;
      saveTodos();
      if (refresh) refresh();
      renderHomeTodos();
      updatePillCounts();
    }
  });
  row.querySelector('.todo-timer-btn').addEventListener('click', () => {
    openTimerSheet(t.id);
  });
  row.querySelector('.todo-x').addEventListener('click', () => {
    todos = todos.filter(x => x.id !== t.id);
    saveTodos();
    if (refresh) refresh();
    renderHomeTodos();
    updatePillCounts();
  });
  return row;
}

function buildTimerRow(t) {
  const row = document.createElement('div');
  const state = t.timer.expired ? 'expired' : (t.timer.endsAt ? 'running' : 'paused');
  row.className = `timer-row ${state}`;
  const ms = t.timer.endsAt ? Math.max(0, t.timer.endsAt - Date.now()) : (t.timer.remainingMs || 0);
  const stateIcon = t.timer.expired ? 'ph-bell-ringing' : (t.timer.endsAt ? 'ph-timer' : 'ph-pause');
  row.innerHTML = `
    <i class="ph ${stateIcon} timer-state-ico"></i>
    <span class="timer-display" data-timer-id="${t.id}">${formatTime(ms)}</span>
    <span class="timer-row-sep"></span>
    <button type="button" class="timer-btn" data-act="toggle" title="${t.timer.endsAt ? 'Pause' : 'Resume'}"><i class="ph ${t.timer.endsAt ? 'ph-pause' : 'ph-play'}"></i></button>
    <button type="button" class="timer-btn" data-act="reset" title="Reset"><i class="ph ph-arrow-counter-clockwise"></i></button>
    <button type="button" class="timer-btn" data-act="remove" title="Remove timer"><i class="ph ph-x"></i></button>
  `;
  row.addEventListener('click', e => {
    const btn = e.target.closest('.timer-btn');
    if (!btn) return;
    e.stopPropagation();
    if (btn.dataset.act === 'toggle') toggleTimer(t.id);
    if (btn.dataset.act === 'reset')  resetTimer(t.id);
    if (btn.dataset.act === 'remove') removeTimer(t.id);
  });
  return row;
}

// ── Timer helpers ───────────────────────────────────────────
function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function startTimerOn(id, mins) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  const ms = Math.max(1, Math.round(mins * 60000));
  t.timer = { durationMs: ms, endsAt: Date.now() + ms, remainingMs: ms, expired: false };
  saveTodos(); reRenderTodoPanel();
}
function toggleTimer(id) {
  const t = todos.find(t => t.id === id);
  if (!t || !t.timer) return;
  if (t.timer.endsAt) {
    t.timer.remainingMs = Math.max(0, t.timer.endsAt - Date.now());
    t.timer.endsAt = null;
  } else {
    if (!t.timer.remainingMs) t.timer.remainingMs = t.timer.durationMs;
    t.timer.endsAt = Date.now() + t.timer.remainingMs;
    t.timer.expired = false;
  }
  saveTodos(); reRenderTodoPanel();
}
function resetTimer(id) {
  const t = todos.find(t => t.id === id);
  if (!t || !t.timer) return;
  t.timer.endsAt = null;
  t.timer.remainingMs = t.timer.durationMs;
  t.timer.expired = false;
  saveTodos(); reRenderTodoPanel();
}
function removeTimer(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  t.timer = null;
  saveTodos(); reRenderTodoPanel();
}
function reRenderTodoPanel() {
  // Keep the homepage active-todos peek in sync with timer / state changes
  renderHomeTodos();
  const todoOverlay = document.querySelector('.panel-overlay[data-panel="todo"]');
  if (!todoOverlay) return;
  if (typeof todoOverlay._refresh === 'function') todoOverlay._refresh();
}
function tickTimers() {
  let fired = false;
  let mutated = false;
  todos.forEach(t => {
    if (t.timer && t.timer.endsAt && Date.now() >= t.timer.endsAt) {
      t.timer.endsAt = null;
      t.timer.remainingMs = 0;
      t.timer.expired = true;
      fired = true;
      mutated = true;
    }
  });
  if (fired) playAlarm();
  if (mutated) { saveTodos(); reRenderTodoPanel(); return; }
  document.querySelectorAll('.timer-display').forEach(el => {
    const t = todos.find(t => t.id === el.dataset.timerId);
    if (!t || !t.timer) return;
    const ms = t.timer.endsAt ? Math.max(0, t.timer.endsAt - Date.now()) : (t.timer.remainingMs || 0);
    el.textContent = formatTime(ms);
  });
}

let alarmCtx = null;
function playAlarm() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!alarmCtx) alarmCtx = new Ctx();
    const ctx = alarmCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const beeps = 6;
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i % 2 === 0 ? 880 : 1175;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.linearRampToValueAtTime(0, start + 0.38);
      osc.start(start);
      osc.stop(start + 0.4);
    }
  } catch (e) {
    /* alarm sound is best-effort; silent if WebAudio is unavailable */
  }
}

// ── Timer sheet (center) ────────────────────────────────────
function openTimerSheet(todoId) {
  const t = todos.find(x => x.id === todoId);
  if (!t) return;
  openPanel({
    title: 'Set timer',
    subtitle: t.text,
    side: 'center',
    render(body, { close }) {
      const f = document.createElement('form');
      f.className = 'sheet-form';
      f.innerHTML = `
        <label class="sheet-label">Presets</label>
        <div class="timer-presets">
          <button type="button" class="preset-btn" data-m="5">5 min</button>
          <button type="button" class="preset-btn" data-m="15">15 min</button>
          <button type="button" class="preset-btn" data-m="25">25 min</button>
          <button type="button" class="preset-btn" data-m="50">50 min</button>
        </div>
        <label class="sheet-label">Custom (minutes)</label>
        <input class="sheet-input" type="number" min="1" max="600" placeholder="e.g. 30" name="mins" />
        <div class="sheet-footer">
          <button type="button" class="sheet-btn ghost" data-act="cancel">Cancel</button>
          <button type="submit" class="sheet-btn primary">Start</button>
        </div>
      `;
      body.appendChild(f);
      f.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', () => {
        startTimerOn(todoId, parseInt(b.dataset.m, 10));
        close();
      }));
      f.querySelector('[data-act=cancel]').addEventListener('click', close);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const v = parseFloat(f.querySelector('[name=mins]').value);
        if (!v || v <= 0) return;
        startTimerOn(todoId, v);
        close();
      });
      setTimeout(() => f.querySelector('[name=mins]').focus(), 30);
    }
  });
}

// ── Settings sheet (center) ─────────────────────────────────
function openSettingsSheet() {
  openPanel({
    title: 'Settings',
    subtitle: 'Wallpaper & backup',
    side: 'center',
    render(body, { close }) {
      const f = document.createElement('div');
      f.className = 'sheet-form';
      const currentMode = getBgMode();
      const currentColor = getBgColor();
      const swatches = COLOR_PALETTE.map(c =>
        `<button type="button" class="color-swatch${c === currentColor ? ' on' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`
      ).join('');

      f.innerHTML = `
        <label class="sheet-label">Wallpaper</label>
        <div class="wp-modes" role="tablist">
          <button type="button" class="wp-mode${currentMode === 'unsplash' ? ' on' : ''}" data-mode="unsplash">Unsplash</button>
          <button type="button" class="wp-mode${currentMode === 'custom'   ? ' on' : ''}" data-mode="custom">Upload</button>
          <button type="button" class="wp-mode${currentMode === 'color'    ? ' on' : ''}" data-mode="color">Solid color</button>
        </div>

        <div class="wp-pane" data-pane="unsplash"${currentMode === 'unsplash' ? '' : ' hidden'}>
          <div class="sheet-row">
            <button type="button" class="sheet-btn ghost outlined" data-act="wp-refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:-2px"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh wallpaper
            </button>
          </div>
          <div class="sheet-hint">A fresh landscape photo from Unsplash every day. The photographer is credited in the bottom-right.</div>
        </div>

        <div class="wp-pane" data-pane="custom"${currentMode === 'custom' ? '' : ' hidden'}>
          <div class="sheet-row">
            <button type="button" class="sheet-btn ghost outlined" data-act="wp-pick">Choose file…</button>
            <button type="button" class="sheet-btn ghost outlined" data-act="wp-clear">Remove</button>
          </div>
          <div class="sheet-hint">JPG, PNG, WebP, or MP4. Min 500×500. Max 50 MB.</div>
        </div>

        <div class="wp-pane" data-pane="color"${currentMode === 'color' ? '' : ' hidden'}>
          <div class="color-palette">${swatches}</div>
        </div>

        <div class="sheet-status" id="wp-status"></div>

        <label class="sheet-label">Backup</label>
        <div class="sheet-row">
          <button type="button" class="sheet-btn ghost outlined" data-act="export">Export backup</button>
          <button type="button" class="sheet-btn ghost outlined" data-act="import">Import backup</button>
          <button type="button" class="sheet-btn ghost outlined danger" data-act="reset">Reset to default</button>
        </div>
        <div class="sheet-hint">Bookmarks, folders, tasks, and notes.</div>
        <div class="sheet-status" id="bk-status"></div>
      `;
      body.appendChild(f);

      const wpStatus = f.querySelector('#wp-status');
      const bkStatus = f.querySelector('#bk-status');

      // Mode switcher
      f.querySelectorAll('.wp-mode').forEach(btn => {
        btn.addEventListener('click', async () => {
          const mode = btn.dataset.mode;
          f.querySelectorAll('.wp-mode').forEach(b => b.classList.toggle('on', b === btn));
          f.querySelectorAll('.wp-pane').forEach(p => { p.hidden = (p.dataset.pane !== mode); });
          setBgMode(mode);
          await setupBackground();
          wpStatus.textContent = '';
        });
      });

      // Paint each swatch from its data-color. The inline style="background:…"
      // in the markup is stripped by the extension's MV3 CSP (style-src 'self'),
      // which is why the boxes were rendering blank. Setting the property
      // via the .style API is exempt from that restriction.
      f.querySelectorAll('.color-swatch').forEach(sw => {
        sw.style.backgroundColor = sw.dataset.color;
      });

      // Solid-color swatches
      f.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', async () => {
          const c = sw.dataset.color;
          f.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('on', s === sw));
          setBgColor(c);
          setBgMode('color');
          await setupBackground();
        });
      });

      f.querySelector('[data-act=wp-refresh]').addEventListener('click', async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        wpStatus.textContent = 'Fetching new photo…';
        try {
          setBgMode('unsplash');
          const photo = await refreshWallpaperNow();
          const bg = $('bg');
          clearBg(bg);
          bg.style.backgroundImage = `url("${photo.url}")`;
          showPhotoCredit(photo);
          wpStatus.textContent = photo.author ? `New photo by ${photo.author}.` : 'Wallpaper refreshed.';
        } catch (e) {
          wpStatus.textContent = 'Could not refresh. Try again.';
        } finally {
          btn.disabled = false;
        }
      });

      f.querySelector('[data-act=wp-pick]').addEventListener('click', () => $('wallpaper-file').click());
      f.querySelector('[data-act=wp-clear]').addEventListener('click', async () => {
        try { await wpDelete(); } catch (e) {}
        await store.set('orbit_wallpaper', null);
        setBgMode('unsplash');
        f.querySelectorAll('.wp-mode').forEach(b => b.classList.toggle('on', b.dataset.mode === 'unsplash'));
        f.querySelectorAll('.wp-pane').forEach(p => { p.hidden = (p.dataset.pane !== 'unsplash'); });
        await setupBackground();
        wpStatus.textContent = 'Custom wallpaper removed.';
      });

      // Wallpaper file handler — rebind each time (single global element)
      $('wallpaper-file').onchange = async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const isVideo = file.type === 'video/mp4' || /\.mp4$/i.test(file.name);
        const isImage = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!isVideo && !isImage) { wpStatus.textContent = 'Unsupported file type.'; return; }
        if (file.size > 50 * 1024 * 1024) {
          wpStatus.textContent = `File is ${(file.size/1024/1024).toFixed(1)} MB — keep under 50 MB.`;
          return;
        }
        wpStatus.textContent = 'Checking…';
        try {
          const dim = await getMediaResolution(file, isVideo);
          if (dim.w < 500 || dim.h < 500) {
            wpStatus.textContent = `Resolution ${dim.w}×${dim.h} is below the 500×500 minimum.`;
            return;
          }
          wpStatus.textContent = 'Saving…';
          await wpPut({ type: isVideo ? 'video' : 'image', blob: file });
          await store.set('orbit_wallpaper', null);
          setBgMode('custom');
          await setupBackground();
          wpStatus.textContent = `Wallpaper updated (${dim.w}×${dim.h}).`;
        } catch (err) {
          wpStatus.textContent = 'Failed: ' + (err.message || err);
        }
      };

      f.querySelector('[data-act=export]').addEventListener('click', () => {
        const data = {
          version: 2,
          exportedAt: new Date().toISOString(),
          orbit_categories: categories,
          orbit_bookmarks: bookmarks,
          orbit_todos: todos,
          orbit_notes: notes,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orbit-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        bkStatus.textContent = 'Backup downloaded.';
      });

      f.querySelector('[data-act=reset]').addEventListener('click', async () => {
        const ok = await customConfirm({
          title: 'Reset Orbit to default?',
          message: 'This permanently deletes all bookmarks, folders, tasks, '
                 + 'notes, and your custom wallpaper. It cannot be undone.',
          confirmLabel: 'Reset everything',
          danger: true,
        });
        if (!ok) return;
        bkStatus.textContent = 'Resetting…';
        try {
          // Domain data (chrome.storage.local or localStorage via shim)
          await store.set('orbit_categories', null);
          await store.set('orbit_bookmarks',  null);
          await store.set('orbit_todos',      null);
          await store.set('orbit_notes',      null);
          await store.set('orbit_wallpaper',  null);
          // UI prefs + wallpaper cache (localStorage)
          ['orbit_search_engine', 'orbit_bg_mode', 'orbit_bg_color',
           'orbit_daily_wp', 'orbit_fallback_idx'].forEach(k => {
            try { localStorage.removeItem(k); } catch (e) {}
          });
          // Wallpaper blob (IndexedDB)
          try { await wpDelete(); } catch (e) {}
          // Reload so the fresh defaults render cleanly.
          location.reload();
        } catch (err) {
          bkStatus.textContent = 'Reset failed: ' + (err.message || err);
        }
      });

      f.querySelector('[data-act=import]').addEventListener('click', () => $('import-file').click());
      $('import-file').onchange = async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data || typeof data !== 'object') throw new Error('Invalid file');
          const cats = Array.isArray(data.orbit_categories) ? data.orbit_categories : null;
          const bms  = Array.isArray(data.orbit_bookmarks)  ? data.orbit_bookmarks  : null;
          const tds  = Array.isArray(data.orbit_todos)      ? data.orbit_todos      : null;
          const nts  = Array.isArray(data.orbit_notes)      ? data.orbit_notes      : null;
          if (!cats && !bms && !tds && !nts) throw new Error('No recognised data');
          const ok = await customConfirm({
            title: 'Import backup?',
            message: 'This will replace your current bookmarks, folders, tasks, and notes.',
            confirmLabel: 'Replace and import',
            danger: true,
          });
          if (!ok) { bkStatus.textContent = 'Import cancelled.'; return; }
          if (cats) categories = cats;
          if (bms)  bookmarks  = migrateBookmarks(bms);
          if (tds)  todos      = tds;
          if (nts)  notes      = nts;
          await saveCats(); await saveBookmarks(); await saveTodos(); await saveNotes();
          renderBookmarks(); renderNotes(); updatePillCounts();
          bkStatus.textContent = 'Backup imported.';
        } catch (err) {
          bkStatus.textContent = 'Failed: ' + (err.message || err);
        }
      };
    }
  });
}

async function getMediaResolution(blob, isVideo) {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((res, rej) => {
      if (isVideo) {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.onloadedmetadata = () => res({ w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => rej(new Error('Could not read video.'));
        v.src = url;
      } else {
        const img = new Image();
        img.onload  = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => rej(new Error('Could not read image.'));
        img.src = url;
      }
    });
  } finally { URL.revokeObjectURL(url); }
}

// ── Media now-playing pill (disabled — feature hidden for now) ──
function renderMediaPill() {
  // Intentional no-op: dynamic island removed per request. The background
  // media broker still updates `mediaState`; we just don't surface it.
  return;
  /* eslint-disable no-unreachable */
  const host = document.getElementById('left-status');
  if (!host) return;
  let pill = host.querySelector('.media-pill');
  if (!mediaState) {
    if (pill) pill.remove();
    return;
  }
  if (!pill) {
    pill = document.createElement('div');
    pill.className = 'glass status-pill media-pill';
    pill.innerHTML = `
      <div class="thumb-wrap">
        <img class="thumb" alt="" />
      </div>
      <span class="media-title"></span>
      <div class="media-btns">
        <button type="button" class="media-btn" data-act="prev" title="Previous">${icon('prev', 12)}</button>
        <button type="button" class="media-btn" data-act="playpause" title="Play/Pause">${icon('play', 12)}</button>
        <button type="button" class="media-btn" data-act="next" title="Next">${icon('next', 12)}</button>
      </div>
    `;
    pill.addEventListener('click', e => {
      if (e.target.closest('.media-btn')) return;
      focusMediaTab();
    });
    pill.querySelector('[data-act=prev]').addEventListener('click', e => { e.stopPropagation(); sendMediaCommand('previous'); });
    pill.querySelector('[data-act=playpause]').addEventListener('click', e => { e.stopPropagation(); sendMediaCommand('playPause'); });
    pill.querySelector('[data-act=next]').addEventListener('click', e => { e.stopPropagation(); sendMediaCommand('next'); });
    host.appendChild(pill);
  }
  const thumb = pill.querySelector('.thumb');
  const fallback = mediaState.origin ? `https://www.google.com/s2/favicons?domain=${mediaState.origin}&sz=128` : '';
  thumb.src = mediaState.artwork || fallback;
  thumb.onerror = () => { if (fallback && thumb.src !== fallback) thumb.src = fallback; };
  pill.querySelector('.media-title').textContent = mediaState.title || mediaState.origin || 'Now playing';
  // Update play/pause icon
  const pp = pill.querySelector('[data-act=playpause]');
  pp.innerHTML = icon(mediaState.playing ? 'pause' : 'play', 12);
  // EQ animation overlay
  let eq = pill.querySelector('.media-eq');
  if (mediaState.playing) {
    if (!eq) {
      eq = document.createElement('div');
      eq.className = 'media-eq';
      eq.innerHTML = '<span></span><span></span><span></span>';
      pill.querySelector('.thumb-wrap').appendChild(eq);
    }
  } else if (eq) eq.remove();
}

function sendMediaCommand(cmd) {
  if (!isExtension || !chrome.runtime || !chrome.runtime.sendMessage) return;
  try { chrome.runtime.sendMessage({ type: 'media:command', cmd }, () => { void chrome.runtime.lastError; }); } catch (e) {}
}
function focusMediaTab() {
  if (!isExtension || !chrome.runtime || !chrome.runtime.sendMessage) return;
  try { chrome.runtime.sendMessage({ type: 'media:focus' }, () => { void chrome.runtime.lastError; }); } catch (e) {}
}

function mediaSnapshot(s) {
  if (!s) return null;
  return { playing: !!s.playing, title: s.title || '', artist: s.artist || '', artwork: s.artwork || '', origin: s.origin || '' };
}

function setupMediaBroker() {
  if (!isExtension || !chrome.runtime || !chrome.runtime.onMessage) return;
  chrome.runtime.onMessage.addListener(msg => {
    if (msg && msg.type === 'media:update') {
      const next = msg.state || null;
      const changed = JSON.stringify(mediaSnapshot(next)) !== JSON.stringify(mediaSnapshot(mediaState));
      mediaState = next;
      if (changed) renderMediaPill();
    }
  });
  const pull = () => {
    try {
      chrome.runtime.sendMessage({ type: 'media:getState' }, resp => {
        void chrome.runtime.lastError;
        const next = (resp && resp.state) || null;
        const changed = JSON.stringify(mediaSnapshot(next)) !== JSON.stringify(mediaSnapshot(mediaState));
        mediaState = next;
        if (changed) renderMediaPill();
      });
    } catch (e) {}
  };
  pull();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  window.addEventListener('focus', pull);
}

// ── Bookmark data migration (pinned + uncategorized → top level) ──
function migrateBookmarks(arr) {
  return (arr || []).map(b => {
    const next = { ...b };
    if (next.pinned) next.pinned = false;
    if (!next.color) next.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return next;
  });
}

// ── Boot ────────────────────────────────────────────────────
async function loadState() {
  categories = (await store.get('orbit_categories')) || [];
  bookmarks  = migrateBookmarks((await store.get('orbit_bookmarks')) || []);
  todos      = (await store.get('orbit_todos')) || [];
  notes      = (await store.get('orbit_notes')) || [];

  // First-run seed: if everything's empty, add a few sensible defaults so the
  // home page isn't a void.
  if (categories.length === 0 && bookmarks.length === 0) {
    bookmarks = [
      { id: uid(), title: 'Mail',   url: 'https://mail.google.com',     color: '#E8623B', categoryId: null },
      { id: uid(), title: 'Drive',  url: 'https://drive.google.com',    color: '#3B82F6', categoryId: null },
      { id: uid(), title: 'Cal',    url: 'https://calendar.google.com', color: '#7C3AED', categoryId: null },
      { id: uid(), title: 'GH',     url: 'https://github.com',          color: '#0F172A', categoryId: null },
    ];
    await saveBookmarks();
  }
}

function wireKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // Close inline menus first, then panels
      if (document.querySelector('.add-menu')) { toggleAddMenu(false); return; }
      if (!$('engine-menu').classList.contains('hidden')) {
        $('engine-menu').classList.add('hidden');
        return;
      }
      if (openPanelStack.length) closeTopPanel();
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault(); openNotesPanel();
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
      e.preventDefault(); openTodoPanel();
    }
  });
}

function wireUi() {
  $('add-bookmark-btn').addEventListener('click', () => { toggleAddMenu(false); openBookmarkSheet(); });
  $('add-caret-btn').addEventListener('click', e => { e.stopPropagation(); toggleAddMenu(); });
  $('settings-btn').addEventListener('click', openSettingsSheet);
  $('notes-pill').addEventListener('click', openNotesPanel);
  $('todo-pill').addEventListener('click', openTodoPanel);

  // Click-outside closes engine menu
  document.addEventListener('click', e => {
    if (!e.target.closest('#engine-menu') && !e.target.closest('#search-engine-btn')) {
      $('engine-menu').classList.add('hidden');
    }
  });
}

// ── Theme-aware favicon ──────────────────────────────────────
// Re-tints the shipped white PNG mark to match the OS / Chrome theme so the
// new-tab favicon stays visible on both light and dark tab strips.
function setupThemeFavicon() {
  const link = document.getElementById('favicon');
  if (!link) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const apply = () => {
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      // Dark theme → keep the mark white. Light theme → tint to deep slate
      // so it's legible against a light tab strip.
      const tint = dark ? '#ffffff' : '#0a0a0a';
      const size = 64;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, size, size);
      link.href = c.toDataURL('image/png');
      document.body.classList.toggle('theme-light', !dark);
      document.body.classList.toggle('theme-dark', dark);
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  };
  img.onerror = () => { /* fall back to the static href already on the link */ };
  img.src = 'icons/128x128.png';
}

async function boot() {
  await loadState();
  setupThemeFavicon();
  setupBackground();
  setupSearch();
  renderClock();
  renderBookmarks();
  renderNotes();
  renderHomeTodos();
  updatePillCounts();
  wireUi();
  wireKeyboard();
  setupMediaBroker();
  setInterval(renderClock, 1000);
  setInterval(tickTimers, 1000);
}
boot();

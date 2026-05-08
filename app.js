/* ============================================================
   Folio — dock dashboard
   ============================================================ */

// ── Storage ──────────────────────────────────────────────────

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
function getDomain(url) { try { return new URL(url).hostname; } catch { return ''; } }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Colors ───────────────────────────────────────────────────

const CAT_COLORS = {
  gold:'#c8a97e', sage:'#6a9e7f', rose:'#b56e72',
  sky:'#5b8db8',  lavender:'#8879b0', amber:'#c08840',
  teal:'#3fa89a', coral:'#e07a5f',
};

// ── Icon library ─────────────────────────────────────────────
// Phosphor icons (https://phosphoricons.com) loaded via web font in newtab.html.
// Map key → { label, ph: phosphor-icon-name }.

const ICONS = {
  folder:       { label: 'Folder',       ph: 'folder' },
  shows:        { label: 'Shows',        ph: 'television' },
  movies:       { label: 'Movies',       ph: 'film-slate' },
  music:        { label: 'Music',        ph: 'music-notes' },
  productivity: { label: 'Productivity', ph: 'check-square' },
  work:         { label: 'Work',         ph: 'briefcase' },
  code:         { label: 'Code',         ph: 'code' },
  design:       { label: 'Design',       ph: 'palette' },
  books:        { label: 'Books',        ph: 'books' },
  learn:        { label: 'Learn',        ph: 'graduation-cap' },
  news:         { label: 'News',         ph: 'newspaper' },
  writing:      { label: 'Writing',      ph: 'pen-nib' },
  ai:           { label: 'AI',           ph: 'brain' },
  games:        { label: 'Games',        ph: 'game-controller' },
  shopping:     { label: 'Shopping',     ph: 'shopping-bag' },
  food:         { label: 'Food',         ph: 'fork-knife' },
  travel:       { label: 'Travel',       ph: 'airplane-tilt' },
  fitness:      { label: 'Fitness',      ph: 'barbell' },
  finance:      { label: 'Finance',      ph: 'wallet' },
  crypto:       { label: 'Crypto',       ph: 'currency-btc' },
  social:       { label: 'Social',       ph: 'users-three' },
  mail:         { label: 'Mail',         ph: 'envelope' },
  chat:         { label: 'Chat',         ph: 'chat-circle' },
  photo:        { label: 'Photo',        ph: 'camera' },
  video:        { label: 'Video',        ph: 'video-camera' },
  tools:        { label: 'Tools',        ph: 'wrench' },
  bookmark:     { label: 'Bookmark',     ph: 'bookmark-simple' },
  star:         { label: 'Star',         ph: 'star' },
  heart:        { label: 'Heart',        ph: 'heart' },
  globe:        { label: 'Globe',        ph: 'globe-hemisphere-west' },
  cloud:        { label: 'Cloud',        ph: 'cloud' },
  rocket:       { label: 'Rocket',       ph: 'rocket-launch' },
  sports:       { label: 'Sports',       ph: 'soccer-ball' },
  music_note:   { label: 'Note',         ph: 'note' },
  calendar:     { label: 'Calendar',     ph: 'calendar' },
  lightbulb:    { label: 'Ideas',        ph: 'lightbulb' },
  map:          { label: 'Map',          ph: 'map-trifold' },
  link:         { label: 'Link',         ph: 'link' },
};

const ICON_KEYS = Object.keys(ICONS);

function renderIcon(key, size = 24) {
  const def = ICONS[key] || ICONS.folder;
  return `<i class="ph ph-${def.ph}" style="font-size:${size}px;line-height:1;"></i>`;
}

// ── State ────────────────────────────────────────────────────

let categories = [];
let bookmarks  = [];
let todos      = [];
let todoFilter = 'all';
let selectedPriority = 'low';
let selectedCatColor = 'gold';
let selectedCatIcon  = 'folder';
let openCatId = null;
let editingCatId = null; // null = creating, otherwise editing this category
let editingPinBmId = null; // null = creating, otherwise editing this pinned bookmark
let mediaState = null;

// ── Clock ────────────────────────────────────────────────────

function updateClock() {
  const now = new Date();
  $('clock').textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const h = now.getHours();
  $('greeting').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
updateClock();
setInterval(updateClock, 10000);

// ── Persist ──────────────────────────────────────────────────

async function saveAll() {
  await store.set('folio_categories', categories);
  await store.set('folio_bookmarks',  bookmarks);
}
async function saveTodos() { await store.set('folio_todos', todos); }

// ── Background ───────────────────────────────────────────────

const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2400&q=80',
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=2400&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=2400&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=2400&q=80',
  'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=2400&q=80',
  'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=2400&q=80',
];
// Wallpaper IndexedDB
const WP_DB = 'folio';
const WP_STORE = 'wallpaper';
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
    tx.onabort = () => rej(tx.error);
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

function applyMedia(bg, blobOrUrl, isVideo, isObjectUrl) {
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

async function setupBackground() {
  const bg = $('bg');
  // Try IndexedDB first
  try {
    const wp = await wpGet();
    if (wp && wp.blob) {
      applyMedia(bg, wp.blob, wp.type === 'video', true);
      return;
    }
  } catch (e) { /* fall through */ }
  // Legacy data URL in chrome.storage (back-compat)
  const legacy = await store.get('folio_wallpaper');
  if (legacy && legacy.dataUrl) {
    applyMedia(bg, legacy.dataUrl, legacy.type === 'video', false);
    return;
  }
  // Default daily rotation
  if (currentBgObjectUrl) { URL.revokeObjectURL(currentBgObjectUrl); currentBgObjectUrl = null; }
  bg.innerHTML = '';
  const day = Math.floor(Date.now() / 86400000);
  bg.style.backgroundImage = `url("${BACKGROUNDS[day % BACKGROUNDS.length]}")`;
}

// ── Quote ────────────────────────────────────────────────────

const QUOTES = [
  { t: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
  { t: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
  { t: "Make it work, make it right, make it fast.", a: "Kent Beck" },
  { t: "Less, but better.", a: "Dieter Rams" },
  { t: "Well done is better than well said.", a: "Benjamin Franklin" },
  { t: "What we think, we become.", a: "Buddha" },
  { t: "The journey of a thousand miles begins with one step.", a: "Lao Tzu" },
  { t: "Whether you think you can or you can't, you're right.", a: "Henry Ford" },
  { t: "Quality is not an act, it is a habit.", a: "Aristotle" },
  { t: "Everything you can imagine is real.", a: "Pablo Picasso" },
  { t: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { t: "Done is better than perfect.", a: "Sheryl Sandberg" },
  { t: "Focus is saying no to a thousand things.", a: "Steve Jobs" },
  { t: "The best way out is always through.", a: "Robert Frost" },
];
function setupQuote() {
  const day = Math.floor(Date.now() / 86400000);
  const q = QUOTES[day % QUOTES.length];
  $('quote-text').textContent = `“${q.t}”`;
  $('quote-author').textContent = q.a;
}

// ── Search bar ───────────────────────────────────────────────

const ENGINES = {
  google: {
    name: 'Google',
    url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    icon: `<svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.2-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z"/>
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.8 5.4 18 9 18z"/>
      <path fill="#FBBC05" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z"/>
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6C13.4.9 11.4 0 9 0 5.4 0 2.4 2.2.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/>
    </svg>`
  },
  bing: {
    name: 'Bing',
    url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    icon: `<svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#00897B" d="M3 1l4 1.5v9.6l5-2-2.5-1L8 5l8 3v3.5L8 16.5 3 14.5z"/>
    </svg>`
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    icon: `<svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="#DE5833"/>
      <path fill="#fff" d="M6.5 8c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5S6.5 8.8 6.5 8z"/>
      <circle cx="11" cy="7.5" r="1" fill="#fff"/>
      <circle cx="11" cy="7.5" r="0.4"/>
      <circle cx="8" cy="8" r="0.4"/>
    </svg>`
  },
};

let currentEngine = 'google';

function setupSearch() {
  currentEngine = localStorage.getItem('folio_search_engine') || 'google';
  if (!ENGINES[currentEngine]) currentEngine = 'google';
  updateEngineIcon();

  // Build dropdown
  const menu = $('engine-menu');
  menu.innerHTML = '';
  Object.entries(ENGINES).forEach(([key, e]) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'engine-option' + (key === currentEngine ? ' active' : '');
    opt.innerHTML = `<span class="search-engine-icon">${e.icon}</span><span>${e.name}</span>`;
    opt.addEventListener('click', () => {
      currentEngine = key;
      localStorage.setItem('folio_search_engine', key);
      updateEngineIcon();
      setupSearch();
      menu.classList.add('hidden');
      $('search-input').focus();
    });
    menu.appendChild(opt);
  });

  $('search-engine-btn').onclick = e => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  };

  document.addEventListener('click', e => {
    if (!e.target.closest('#engine-menu') && !e.target.closest('#search-engine-btn')) {
      menu.classList.add('hidden');
    }
  });

  $('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) return;
    window.location.href = ENGINES[currentEngine].url(q);
  });
}

function updateEngineIcon() {
  $('search-engine-icon').innerHTML = ENGINES[currentEngine].icon;
}

// ── Notes ────────────────────────────────────────────────────

let notes = [];
let editingNoteId = null;
let selectedNoteColor = 'yellow';

const NOTE_COLORS = {
  yellow: '#e8d27a',
  pink:   '#e8a5b9',
  blue:   '#9bbde0',
  green:  '#a8d3a0',
  purple: '#bfa6dc',
  peach:  '#e8b896',
};

async function saveNotes() { await store.set('folio_notes', notes); }

function renderNotes() {
  const layer = $('pinned-notes-layer');
  layer.innerHTML = '';
  notes.forEach((n, i) => {
    if (!n.position || typeof n.position.x !== 'number') {
      n.position = { x: 24, y: 80 + i * 180 };
    }
    if (!n.size || typeof n.size.w !== 'number') {
      n.size = { w: 200, h: 160 };
    }
    const card = makeNoteCard(n);
    card.style.left = n.position.x + 'px';
    card.style.top  = n.position.y + 'px';
    card.style.width  = n.size.w + 'px';
    card.style.height = n.size.h + 'px';
    attachNoteDrag(card, n);
    attachNoteResize(card, n);
    layer.appendChild(card);
  });
}

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
      const w = Math.max(140, Math.min(window.innerWidth  - note.position.x - 8, startW + (ev.clientX - startX)));
      const h = Math.max(80,  Math.min(window.innerHeight - note.position.y - 8, startH + (ev.clientY - startY)));
      card.style.width = w + 'px';
      card.style.height = h + 'px';
      note.size.w = w;
      note.size.h = h;
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
    if (e.target.closest('.note-act')) return;
    if (e.target.closest('.note-resize')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origX = note.position.x, origY = note.position.y;
    let moved = false;
    card.classList.add('dragging');

    const onMove = ev => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) + Math.abs(dy) > 3)) moved = true;
      const w = card.offsetWidth, h = card.offsetHeight;
      const x = Math.max(4, Math.min(window.innerWidth  - w - 4, origX + dx));
      const y = Math.max(4, Math.min(window.innerHeight - h - 4, origY + dy));
      card.style.left = x + 'px';
      card.style.top  = y + 'px';
      note.position.x = x;
      note.position.y = y;
    };
    const onUp = () => {
      card.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) saveNotes();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function makeNoteCard(note) {
  const card = document.createElement('div');
  card.className = `note-card note-${note.color || 'yellow'}`;
  card.style.setProperty('--note-color', NOTE_COLORS[note.color] || NOTE_COLORS.yellow);

  const text = document.createElement('div');
  text.className = 'note-text-display';
  text.textContent = note.text;
  card.appendChild(text);

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'note-act';
  editBtn.title = 'Edit';
  editBtn.innerHTML = `<i class="ph ph-pencil-simple"></i>`;
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    openNoteForm(note.id);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'note-act danger';
  delBtn.title = 'Delete';
  delBtn.innerHTML = `<i class="ph ph-trash"></i>`;
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    notes = notes.filter(x => x.id !== note.id);
    saveNotes(); renderNotes();
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);

  return card;
}

function openNoteForm(id) {
  closeAllPopups();
  editingNoteId = id || null;
  if (id) {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    $('note-text').value = n.text;
    selectedNoteColor = n.color || 'yellow';
  } else {
    $('note-text').value = '';
    selectedNoteColor = 'yellow';
  }
  document.querySelectorAll('#note-swatches .swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === selectedNoteColor);
  });
  $('note-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  setTimeout(() => $('note-text').focus(), 0);
}

function closeNoteForm() {
  $('note-form').classList.add('hidden');
  editingNoteId = null;
  if (!openCatId) $('popup-backdrop').classList.remove('visible');
}

// ── Settings ─────────────────────────────────────────────────

function openSettings() {
  closeAllPopups();
  $('settings-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  $('wallpaper-status').textContent = '';
  $('backup-status').textContent = '';
}
function closeSettings() {
  $('settings-form').classList.add('hidden');
  if (!openCatId) $('popup-backdrop').classList.remove('visible');
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
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => rej(new Error('Could not read image.'));
        img.src = url;
      }
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setupSettings() {
  $('settings-btn').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', closeSettings);

  $('wallpaper-pick').addEventListener('click', () => $('wallpaper-file').click());
  $('wallpaper-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const status = $('wallpaper-status');
    const isVideo = file.type === 'video/mp4' || /\.mp4$/i.test(file.name);
    const isImage = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!isVideo && !isImage) {
      status.textContent = 'Unsupported file type.';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      status.textContent = `File is ${(file.size/1024/1024).toFixed(1)} MB — keep under 50 MB.`;
      return;
    }
    status.textContent = 'Checking…';
    try {
      const dim = await getMediaResolution(file, isVideo);
      if (dim.w < 500 || dim.h < 500) {
        status.textContent = `Resolution ${dim.w}×${dim.h} is below the 500×500 minimum.`;
        return;
      }
      status.textContent = 'Saving…';
      try {
        await wpPut({ type: isVideo ? 'video' : 'image', blob: file });
        await store.set('folio_wallpaper', null); // drop legacy entry
      } catch (saveErr) {
        status.textContent = `Couldn't save: ${saveErr.message || saveErr}.`;
        return;
      }
      await setupBackground();
      status.textContent = `Wallpaper updated (${dim.w}×${dim.h}).`;
    } catch (err) {
      status.textContent = 'Failed: ' + (err.message || err);
    }
  });
  $('wallpaper-reset').addEventListener('click', async () => {
    try { await wpDelete(); } catch (e) {}
    await store.set('folio_wallpaper', null);
    await setupBackground();
    $('wallpaper-status').textContent = 'Default wallpaper restored.';
  });

  $('export-btn').addEventListener('click', () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folio_categories: categories,
      folio_bookmarks: bookmarks,
      folio_todos: todos,
      folio_notes: notes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folio-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $('backup-status').textContent = 'Backup downloaded.';
  });

  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const status = $('backup-status');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('Invalid file');
      const cats = Array.isArray(data.folio_categories) ? data.folio_categories : null;
      const bms  = Array.isArray(data.folio_bookmarks)  ? data.folio_bookmarks  : null;
      const tds  = Array.isArray(data.folio_todos)      ? data.folio_todos      : null;
      const nts  = Array.isArray(data.folio_notes)      ? data.folio_notes      : null;
      if (!cats && !bms && !tds && !nts) throw new Error('No recognised data');
      if (!confirm('Import will replace your current bookmarks, folders, tasks, and notes. Continue?')) {
        status.textContent = 'Import cancelled.';
        return;
      }
      if (cats) categories = cats;
      if (bms)  bookmarks  = bms;
      if (tds)  todos      = tds;
      if (nts)  notes      = nts;
      await saveAll(); await saveTodos(); await saveNotes();
      renderDock(); renderTodos(); renderNotes();
      status.textContent = 'Backup imported.';
    } catch (err) {
      status.textContent = 'Failed: ' + (err.message || err);
    }
  });
}

function setupNotes() {
  $('add-note-btn').addEventListener('click', () => openNoteForm(null));
  $('note-cancel').addEventListener('click', closeNoteForm);
  $('note-save').addEventListener('click', () => {
    const text = $('note-text').value.trim();
    if (!text) { $('note-text').focus(); return; }
    if (editingNoteId) {
      const n = notes.find(x => x.id === editingNoteId);
      if (n) { n.text = text; n.color = selectedNoteColor; }
    } else {
      notes.unshift({ id: uid(), text, color: selectedNoteColor });
    }
    saveNotes(); renderNotes();
    closeNoteForm();
  });
  document.querySelectorAll('#note-swatches .swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#note-swatches .swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      selectedNoteColor = sw.dataset.color;
    });
  });
}

// ── Dock ─────────────────────────────────────────────────────

const PLUS_ICON = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
  <path d="M11 5v12M5 11h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
</svg>`;

// ── Media island ─────────────────────────────────────────────

function renderMediaIsland() {
  if (!mediaState) return null;
  const tile = document.createElement('div');
  tile.className = 'dock-tile media-island' + (mediaState.playing ? ' playing' : '');
  tile.title = `Open ${mediaState.title || mediaState.origin || 'media'}`;
  tile.draggable = true;
  tile.addEventListener('click', e => {
    if (e.target.closest('.media-island-btn')) return;
    focusMediaTab();
  });
  tile.addEventListener('dragstart', e => {
    if (e.target.closest('.media-island-btn')) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/island', '1');
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => tile.classList.add('dock-dragging'), 0);
  });
  tile.addEventListener('dragend', () => {
    tile.classList.remove('dock-dragging');
    clearDockDropMarkers();
  });

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'media-island-thumb-wrap';
  const thumb = document.createElement('img');
  thumb.className = 'media-island-thumb';
  thumb.draggable = false;
  const fallbackIcon = mediaState.origin
    ? `https://www.google.com/s2/favicons?domain=${mediaState.origin}&sz=128`
    : '';
  thumb.src = mediaState.artwork || fallbackIcon;
  thumb.onerror = () => { if (fallbackIcon && thumb.src !== fallbackIcon) thumb.src = fallbackIcon; };
  thumbWrap.appendChild(thumb);
  if (mediaState.playing) {
    const eq = document.createElement('div');
    eq.className = 'media-eq';
    eq.innerHTML = '<span></span><span></span><span></span>';
    thumbWrap.appendChild(eq);
  }

  const info = document.createElement('div');
  info.className = 'media-island-info';
  const titleEl = document.createElement('div');
  titleEl.className = 'media-island-title';
  titleEl.textContent = mediaState.title || 'Untitled';
  const subEl = document.createElement('div');
  subEl.className = 'media-island-sub';
  subEl.textContent = mediaState.artist || mediaState.origin || '';
  info.appendChild(titleEl);
  info.appendChild(subEl);

  const btns = document.createElement('div');
  btns.className = 'media-island-btns';
  const mkBtn = (icon, cmd, label) => {
    const b = document.createElement('button');
    b.className = 'media-island-btn';
    b.title = label;
    b.innerHTML = `<i class="ph ph-${icon}"></i>`;
    b.addEventListener('click', e => {
      e.stopPropagation();
      sendMediaCommand(cmd);
    });
    return b;
  };
  btns.appendChild(mkBtn('skip-back', 'previous', 'Previous'));
  btns.appendChild(mkBtn(mediaState.playing ? 'pause' : 'play', 'playPause', mediaState.playing ? 'Pause' : 'Play'));
  btns.appendChild(mkBtn('skip-forward', 'next', 'Next'));

  tile.appendChild(thumbWrap);
  tile.appendChild(info);
  tile.appendChild(btns);
  return tile;
}

function sendMediaCommand(cmd) {
  if (!isExtension || !chrome.runtime || !chrome.runtime.sendMessage) return;
  try {
    chrome.runtime.sendMessage({ type: 'media:command', cmd }, () => { void chrome.runtime.lastError; });
  } catch (e) { /* noop */ }
}

function focusMediaTab() {
  if (!isExtension || !chrome.runtime || !chrome.runtime.sendMessage) return;
  try {
    chrome.runtime.sendMessage({ type: 'media:focus' }, () => { void chrome.runtime.lastError; });
  } catch (e) { /* noop */ }
}

function setupIslandDrop() {
  const dock = $('dock');
  if (!dock || dock._islandDropAttached) return;
  dock._islandDropAttached = true;
  dock.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('text/island')) return;
    const tile = e.target.closest('.dock-tile, .dock-divider');
    if (!tile || tile.classList.contains('media-island')) {
      clearDockDropMarkers();
      return;
    }
    e.preventDefault();
    const rect = tile.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    setDockDropMarker(tile, after);
  });
  dock.addEventListener('dragleave', e => {
    if (!e.dataTransfer.types.includes('text/island')) return;
    if (!dock.contains(e.relatedTarget)) clearDockDropMarkers();
  });
  dock.addEventListener('drop', e => {
    if (!e.dataTransfer.types.includes('text/island')) return;
    const tile = e.target.closest('.dock-tile, .dock-divider');
    clearDockDropMarkers();
    if (!tile || tile.classList.contains('media-island')) return;
    e.preventDefault();
    const rect = tile.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    reorderIsland(tile, after);
  });
}

function mediaSnapshot(s) {
  if (!s) return null;
  return {
    playing: !!s.playing,
    title: s.title || '',
    artist: s.artist || '',
    artwork: s.artwork || '',
    origin: s.origin || '',
  };
}

function setupMediaIsland() {
  setupIslandDrop();
  if (!isExtension || !chrome.runtime || !chrome.runtime.onMessage) return;
  chrome.runtime.onMessage.addListener(msg => {
    if (msg && msg.type === 'media:update') {
      const next = msg.state || null;
      const changed = JSON.stringify(mediaSnapshot(next)) !== JSON.stringify(mediaSnapshot(mediaState));
      mediaState = next;
      if (changed) renderDock();
    }
  });
  const pull = () => {
    try {
      chrome.runtime.sendMessage({ type: 'media:getState' }, resp => {
        void chrome.runtime.lastError;
        const next = (resp && resp.state) || null;
        const changed = JSON.stringify(mediaSnapshot(next)) !== JSON.stringify(mediaSnapshot(mediaState));
        mediaState = next;
        if (changed) renderDock();
      });
    } catch (e) { /* service worker not ready */ }
  };
  pull();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  window.addEventListener('focus', pull);
}

function renderDock() {
  const dock = $('dock');
  dock.innerHTML = '';
  const children = [];

  const pinnedBms = bookmarks.filter(b => b.pinned);
  pinnedBms.forEach(bm => children.push(makePinnedBookmarkTile(bm)));

  categories.forEach(cat => {
    const bms = bookmarks.filter(b => b.categoryId === cat.id);
    children.push(makeDockTile({
      id: cat.id,
      icon: cat.icon || 'folder',
      color: CAT_COLORS[cat.color] || CAT_COLORS.gold,
      count: bms.length,
      bookmarks: bms,
    }));
  });

  const uncatBms = bookmarks.filter(b => !b.pinned && (!b.categoryId || !categories.find(c => c.id === b.categoryId)));
  if (uncatBms.length > 0) {
    children.push(makeDockTile({
      id: '__uncat__',
      icon: 'folder',
      color: 'rgba(140,140,150,0.75)',
      count: uncatBms.length,
      uncat: true,
      bookmarks: uncatBms,
    }));
  }

  if (categories.length > 0 || uncatBms.length > 0 || pinnedBms.length > 0) {
    const d = document.createElement('div');
    d.className = 'dock-divider';
    children.push(d);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'dock-tile add-tile';
  addBtn.title = 'Add bookmark or folder';
  addBtn.innerHTML = `<div class="dock-tile-inner"><i class="ph ph-plus" style="font-size:26px;"></i></div>`;
  addBtn.addEventListener('click', e => {
    e.stopPropagation();
    closePopup();
    const r = addBtn.getBoundingClientRect();
    showContextMenu(r.left + r.width / 2 - 90, r.top - 8, [
      { icon: 'bookmark-simple', label: 'New bookmark', action: () => openPinBookmarkForm() },
      { icon: 'folder-plus',     label: 'New folder',   action: () => openCategoryForm(null) },
    ]);
  });
  children.push(addBtn);

  // Insert media island at saved slot (defaults to dock center)
  const island = renderMediaIsland();
  if (island) {
    const saved = parseInt(localStorage.getItem('folio_island_pos') || '', 10);
    const idx = Number.isFinite(saved)
      ? Math.max(0, Math.min(children.length, saved))
      : Math.floor(children.length / 2);
    children.splice(idx, 0, island);
  }

  children.forEach(c => dock.appendChild(c));
}

function reorderIsland(targetTile, after) {
  const dock = $('dock');
  const all = Array.from(dock.children);
  const targetIdx = all.indexOf(targetTile);
  if (targetIdx === -1) return;
  const islandIdx = all.findIndex(t => t.classList && t.classList.contains('media-island'));
  // Translate target's position into the "without-island" array used by renderDock.
  let withoutIslandIdx = targetIdx;
  if (islandIdx !== -1 && islandIdx < targetIdx) withoutIslandIdx -= 1;
  const newIdx = after ? withoutIslandIdx + 1 : withoutIslandIdx;
  localStorage.setItem('folio_island_pos', String(Math.max(0, newIdx)));
  renderDock();
}

function makePinnedBookmarkTile(bm) {
  const tile = document.createElement('a');
  tile.className = 'dock-tile pinned-bm';
  tile.href = bm.url;
  tile.target = '_self';
  tile.dataset.bmId = bm.id;
  tile.title = bm.title || bm.url;
  tile.draggable = true;

  const fav = document.createElement('div');
  fav.className = 'dock-tile-favicon';
  const domain = getDomain(bm.url);
  if (domain) {
    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    img.onerror = () => {
      fav.textContent = ((bm.title || domain || '?')[0] || '?').toUpperCase();
    };
    fav.appendChild(img);
  } else {
    fav.textContent = ((bm.title || '?')[0] || '?').toUpperCase();
  }
  tile.appendChild(fav);

  tile.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/bm-id', bm.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => tile.classList.add('dock-dragging'), 0);
  });
  tile.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { icon: 'pencil-simple', label: 'Edit bookmark', action: () => openPinBookmarkForm(bm.id) },
      { icon: 'trash', label: 'Delete bookmark', danger: true, action: () => deletePinnedBookmark(bm.id) },
    ]);
  });
  tile.addEventListener('dragend', () => {
    tile.classList.remove('dock-dragging');
    clearDockDropMarkers();
  });
  tile.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('text/bm-id')) return;
    e.preventDefault();
    const rect = tile.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    setDockDropMarker(tile, after);
  });
  tile.addEventListener('dragleave', () => {
    clearDockDropMarkers();
  });
  tile.addEventListener('drop', e => {
    const bmId = e.dataTransfer.getData('text/bm-id');
    clearDockDropMarkers();
    if (!bmId || bmId === bm.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = tile.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    reorderPinnedBookmark(bmId, bm.id, after);
  });

  return tile;
}

function makeDockTile({ id, icon, color, count, uncat, bookmarks: bms }) {
  const tile = document.createElement('div');
  tile.className = 'dock-tile' + (uncat ? ' uncat' : '');
  tile.style.setProperty('--tile-color', color);
  tile.dataset.catId = id;
  tile.setAttribute('role', 'button');
  tile.setAttribute('tabindex', '0');
  if (!uncat) tile.draggable = true;
  tile.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); }
  });

  tile.innerHTML = `
    ${(bms && bms.length > 0) ? '' : `<div class="dock-tile-inner">${renderIcon(icon, 32)}</div>`}
    ${count ? `<span class="dock-tile-count">${count}</span>` : ''}
  `;
  if (bms && bms.length > 0) {
    tile.insertBefore(buildMosaic(bms), tile.firstChild);
  }

  tile.addEventListener('click', e => {
    e.stopPropagation();
    if (openCatId === id) closePopup();
    else openPopup(id);
  });

  if (!uncat) {
    tile.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/cat-id', id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => tile.classList.add('dock-dragging'), 0);
    });
    tile.addEventListener('dragend', () => {
      tile.classList.remove('dock-dragging');
      clearDockDropMarkers();
    });
    tile.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        { icon: 'pencil-simple', label: 'Edit folder', action: () => { closePopup(); openCategoryForm(id); } },
        { icon: 'trash', label: 'Delete folder', danger: true, action: () => deleteCategory(id) },
      ]);
    });
  }

  tile.addEventListener('dragover', e => {
    const types = e.dataTransfer.types;
    if (types.includes('text/cat-id')) {
      if (uncat) return;
      e.preventDefault();
      const rect = tile.getBoundingClientRect();
      const after = e.clientX > rect.left + rect.width / 2;
      setDockDropMarker(tile, after);
    } else if (types.includes('text/bm-id')) {
      e.preventDefault();
      clearDockDropMarkers();
      tile.classList.add('drop-target');
    }
  });
  tile.addEventListener('dragleave', () => {
    clearDockDropMarkers();
  });
  tile.addEventListener('drop', e => {
    clearDockDropMarkers();
    const catId = e.dataTransfer.getData('text/cat-id');
    if (catId) {
      if (uncat || catId === id) return;
      e.preventDefault();
      const rect = tile.getBoundingClientRect();
      const after = e.clientX > rect.left + rect.width / 2;
      reorderCategory(catId, id, after);
      return;
    }
    const bmId = e.dataTransfer.getData('text/bm-id');
    if (!bmId) return;
    e.preventDefault();
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm) return;
    bm.categoryId = id === '__uncat__' ? null : id;
    bm.pinned = false;
    saveAll();
    renderDock();
    if (openCatId) renderPopup();
  });

  return tile;
}

function clearDockDropMarkers() {
  document.querySelectorAll('.dock-tile').forEach(t => {
    t.classList.remove('drop-target','dock-drop-before','dock-drop-after');
    const line = t.querySelector('.dock-drop-line');
    if (line) line.remove();
  });
}

function setDockDropMarker(tile, after) {
  clearDockDropMarkers();
  tile.classList.add(after ? 'dock-drop-after' : 'dock-drop-before');
  const line = document.createElement('span');
  line.className = 'dock-drop-line';
  tile.appendChild(line);
}

function reorderCategory(draggedId, targetId, after) {
  const dragged = categories.find(c => c.id === draggedId);
  const target  = categories.find(c => c.id === targetId);
  if (!dragged || !target) return;
  categories = categories.filter(c => c.id !== draggedId);
  const idx = categories.indexOf(target);
  categories.splice(after ? idx + 1 : idx, 0, dragged);
  saveAll();
  renderDock();
}

function deleteCategory(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;
  if (!confirm(`Delete folder "${cat.name}"? Bookmarks become uncategorized.`)) return;
  bookmarks = bookmarks.map(b => b.categoryId === catId ? { ...b, categoryId: null } : b);
  categories = categories.filter(c => c.id !== catId);
  saveAll();
  if (openCatId === catId) closePopup();
  renderDock();
}

function deletePinnedBookmark(bmId) {
  const bm = bookmarks.find(b => b.id === bmId);
  if (!bm) return;
  if (!confirm(`Delete bookmark "${bm.title || bm.url}"?`)) return;
  bookmarks = bookmarks.filter(b => b.id !== bmId);
  saveAll();
  renderDock();
}

function reorderPinnedBookmark(draggedId, targetId, after) {
  const dragged = bookmarks.find(b => b.id === draggedId);
  const target  = bookmarks.find(b => b.id === targetId);
  if (!dragged || !target) return;
  dragged.pinned = true;
  dragged.categoryId = null;
  bookmarks = bookmarks.filter(b => b.id !== draggedId);
  const idx = bookmarks.indexOf(target);
  bookmarks.splice(after ? idx + 1 : idx, 0, dragged);
  saveAll();
  renderDock();
}

// ── Popup ────────────────────────────────────────────────────

function openPopup(catId) {
  closeAllPopups();
  openCatId = catId;
  document.querySelectorAll('.dock-tile').forEach(t => {
    t.classList.toggle('active', t.dataset.catId === catId);
  });
  $('dock-popup').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  $('bookmark-form').classList.add('hidden');
  closeCategoryForm();
  renderPopup();
}

function closePopup() {
  openCatId = null;
  $('dock-popup').classList.add('hidden');
  $('popup-backdrop').classList.remove('visible');
  $('bookmark-form').classList.add('hidden');
  document.querySelectorAll('.dock-tile').forEach(t => t.classList.remove('active'));
}

function renderPopup() {
  if (!openCatId) return;
  const isUncat = openCatId === '__uncat__';
  const cat = isUncat ? null : categories.find(c => c.id === openCatId);
  if (!isUncat && !cat) { closePopup(); return; }

  const bms = isUncat
    ? bookmarks.filter(b => !b.categoryId || !categories.find(c => c.id === b.categoryId))
    : bookmarks.filter(b => b.categoryId === cat.id);

  $('popup-name').textContent = isUncat ? 'Uncategorized' : cat.name;
  $('popup-dot').style.background = isUncat ? 'rgba(140,140,150,0.8)' : (CAT_COLORS[cat.color] || CAT_COLORS.gold);
  $('popup-count').textContent = bms.length;

  $('popup-edit').style.display = isUncat ? 'none' : '';
  $('popup-delete').style.display = isUncat ? 'none' : '';

  const list = $('popup-list');
  list.innerHTML = '';
  if (bms.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'popup-empty';
    empty.textContent = 'No bookmarks yet. Click + to add one.';
    list.appendChild(empty);
    return;
  }
  bms.forEach(bm => list.appendChild(makeBookmarkRow(bm)));
}

function makeBookmarkRow(bm) {
  const row = document.createElement('a');
  row.className = 'bm-row';
  row.draggable = true;
  row.dataset.bmId = bm.id;
  row.href = bm.url;
  row.target = '_self';
  row.title = bm.title || bm.url;

  const domain = getDomain(bm.url);
  let favicon;
  if (domain) {
    const img = document.createElement('img');
    img.className = 'bm-favicon';
    img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    img.onerror = () => img.replaceWith(makeFallbackIcon(bm.title || domain));
    favicon = img;
  } else {
    favicon = makeFallbackIcon(bm.title || '?');
  }

  const info = document.createElement('div');
  info.className = 'bm-info';

  const titleEl = document.createElement('span');
  titleEl.className = 'bm-title';
  titleEl.textContent = bm.title || domain || bm.url;

  const urlEl = document.createElement('span');
  urlEl.className = 'bm-url';
  urlEl.textContent = domain || bm.url;

  info.appendChild(titleEl);
  info.appendChild(urlEl);

  row.appendChild(favicon);
  row.appendChild(info);

  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { icon: 'pencil-simple', label: 'Edit bookmark', action: () => openPinBookmarkForm(bm.id) },
      { icon: 'trash', label: 'Delete bookmark', danger: true, action: () => {
        bookmarks = bookmarks.filter(b => b.id !== bm.id);
        saveAll(); renderDock(); renderPopup();
      }},
    ]);
  });

  row.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/bm-id', bm.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => row.classList.add('bm-dragging'), 0);
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('bm-dragging');
    document.querySelectorAll('.bm-row').forEach(r => r.classList.remove('bm-drop-before','bm-drop-after'));
  });

  row.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('text/bm-id')) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = row.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    document.querySelectorAll('.bm-row').forEach(r => r.classList.remove('bm-drop-before','bm-drop-after'));
    row.classList.add(after ? 'bm-drop-after' : 'bm-drop-before');
  });
  row.addEventListener('dragleave', () => {
    row.classList.remove('bm-drop-before','bm-drop-after');
  });
  row.addEventListener('drop', e => {
    const bmId = e.dataTransfer.getData('text/bm-id');
    if (!bmId || bmId === bm.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = row.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    row.classList.remove('bm-drop-before','bm-drop-after');
    reorderBookmark(bmId, bm.id, after);
  });

  return row;
}

function reorderBookmark(draggedId, targetId, after) {
  const dragged = bookmarks.find(b => b.id === draggedId);
  const target  = bookmarks.find(b => b.id === targetId);
  if (!dragged || !target) return;
  dragged.categoryId = target.categoryId;
  dragged.pinned = false;
  bookmarks = bookmarks.filter(b => b.id !== draggedId);
  const idx = bookmarks.indexOf(target);
  bookmarks.splice(after ? idx + 1 : idx, 0, dragged);
  saveAll();
  renderDock();
  renderPopup();
}

function buildMosaic(bms) {
  const wrap = document.createElement('div');
  wrap.className = 'dock-tile-mosaic';
  for (let i = 0; i < 4; i++) {
    const bm = bms[i];
    const cell = document.createElement('div');
    cell.className = 'mosaic-cell';
    if (!bm) {
      cell.classList.add('empty');
    } else {
      const domain = getDomain(bm.url);
      const letter = ((bm.title || domain || '?')[0] || '?').toUpperCase();
      if (domain) {
        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        img.draggable = false;
        img.onerror = () => {
          const span = document.createElement('span');
          span.className = 'mosaic-letter';
          span.textContent = letter;
          img.replaceWith(span);
        };
        cell.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.className = 'mosaic-letter';
        span.textContent = letter;
        cell.appendChild(span);
      }
    }
    wrap.appendChild(cell);
  }
  return wrap;
}

function makeFallbackIcon(label) {
  const div = document.createElement('div');
  div.className = 'bm-favicon-fallback';
  div.textContent = (label || '?')[0].toUpperCase();
  return div;
}

// ── Popup actions ────────────────────────────────────────────

$('popup-close').addEventListener('click', e => { e.stopPropagation(); closePopup(); });
$('popup-backdrop').addEventListener('click', () => closePopup());

$('popup-add-bm').addEventListener('click', e => {
  e.stopPropagation();
  $('bookmark-form').classList.toggle('hidden');
  $('bm-url').focus();
});

$('popup-edit').addEventListener('click', e => {
  e.stopPropagation();
  if (!openCatId || openCatId === '__uncat__') return;
  openCategoryForm(openCatId);
});

$('popup-delete').addEventListener('click', e => {
  e.stopPropagation();
  if (!openCatId || openCatId === '__uncat__') return;
  const cat = categories.find(c => c.id === openCatId);
  if (!cat) return;
  if (!confirm(`Delete folder "${cat.name}"? Bookmarks become uncategorized.`)) return;
  bookmarks = bookmarks.map(b => b.categoryId === cat.id ? { ...b, categoryId: null } : b);
  categories = categories.filter(c => c.id !== cat.id);
  saveAll();
  closePopup();
  renderDock();
});

function closeAllPopups() {
  closePopup();
  closeCategoryForm();
  closePinBookmarkForm();
  closeTimerForm();
  closeNoteForm();
  closeSettings();
  closeTodoForm();
  closeTasksPopup();
  $('engine-menu').classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllPopups();
});

// ── Bookmark form ────────────────────────────────────────────

$('bm-cancel').addEventListener('click', () => $('bookmark-form').classList.add('hidden'));
$('bm-save').addEventListener('click', () => {
  const url = $('bm-url').value.trim();
  if (!url) { $('bm-url').focus(); return; }
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  const domain = getDomain(fullUrl);
  const title = $('bm-title').value.trim() || domain;
  const categoryId = openCatId && openCatId !== '__uncat__' ? openCatId : null;
  bookmarks.unshift({ id: uid(), url: fullUrl, title, categoryId });
  saveAll(); renderDock(); renderPopup();
  $('bm-url').value = '';
  $('bm-title').value = '';
  $('bookmark-form').classList.add('hidden');
});
$('bm-url').addEventListener('keydown', e => { if (e.key === 'Enter') $('bm-save').click(); });

// ── Category form (create/edit) ──────────────────────────────

function buildIconPicker() {
  const grid = $('icon-picker');
  grid.innerHTML = '';
  ICON_KEYS.forEach(key => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-option' + (key === selectedCatIcon ? ' active' : '');
    btn.dataset.icon = key;
    btn.title = ICONS[key].label;
    btn.innerHTML = renderIcon(key, 18);
    btn.addEventListener('click', () => {
      selectedCatIcon = key;
      grid.querySelectorAll('.icon-option').forEach(b => b.classList.toggle('active', b.dataset.icon === key));
    });
    grid.appendChild(btn);
  });
}

function openCategoryForm(catId) {
  closeAllPopups();
  editingCatId = catId;
  if (catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    $('cat-name').value = cat.name;
    selectedCatColor = cat.color || 'gold';
    selectedCatIcon  = cat.icon  || 'folder';
  } else {
    $('cat-name').value = '';
    selectedCatColor = 'gold';
    selectedCatIcon = 'folder';
  }

  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === selectedCatColor);
  });
  buildIconPicker();

  $('category-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  setTimeout(() => $('cat-name').focus(), 0);
}

function closeCategoryForm() {
  $('category-form').classList.add('hidden');
  if (!openCatId) $('popup-backdrop').classList.remove('visible');
  editingCatId = null;
}

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    selectedCatColor = sw.dataset.color;
  });
});
$('cat-cancel').addEventListener('click', () => closeCategoryForm());
$('cat-save').addEventListener('click', () => {
  const name = $('cat-name').value.trim();
  if (!name) { $('cat-name').focus(); return; }
  if (editingCatId) {
    const cat = categories.find(c => c.id === editingCatId);
    if (cat) {
      cat.name = name;
      cat.color = selectedCatColor;
      cat.icon = selectedCatIcon;
    }
  } else {
    categories.push({ id: uid(), name, color: selectedCatColor, icon: selectedCatIcon, collapsed: false });
  }
  saveAll();
  renderDock();
  if (openCatId) renderPopup();
  closeCategoryForm();
});
$('cat-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('cat-save').click(); });

// Backdrop click closes category form too
$('popup-backdrop').addEventListener('click', () => closeCategoryForm());

// ── Pinned bookmark form ─────────────────────────────────────

function openPinBookmarkForm(bmId) {
  closeAllPopups();
  editingPinBmId = bmId || null;
  if (bmId) {
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm) return;
    $('pin-bm-url').value = bm.url || '';
    $('pin-bm-title').value = bm.title || '';
    $('pin-bm-save').textContent = 'Save';
  } else {
    $('pin-bm-url').value = '';
    $('pin-bm-title').value = '';
    $('pin-bm-save').textContent = 'Add';
  }
  $('pin-bm-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  setTimeout(() => $('pin-bm-url').focus(), 0);
}
function closePinBookmarkForm() {
  $('pin-bm-form').classList.add('hidden');
  editingPinBmId = null;
  if (!openCatId) $('popup-backdrop').classList.remove('visible');
}
$('pin-bm-cancel').addEventListener('click', closePinBookmarkForm);
$('pin-bm-save').addEventListener('click', () => {
  const url = $('pin-bm-url').value.trim();
  if (!url) { $('pin-bm-url').focus(); return; }
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  const domain = getDomain(fullUrl);
  const title = $('pin-bm-title').value.trim() || domain;
  if (editingPinBmId) {
    const bm = bookmarks.find(b => b.id === editingPinBmId);
    if (bm) { bm.url = fullUrl; bm.title = title; }
  } else {
    bookmarks.unshift({ id: uid(), url: fullUrl, title, categoryId: null, pinned: true });
  }
  saveAll();
  renderDock();
  closePinBookmarkForm();
});
$('pin-bm-url').addEventListener('keydown', e => { if (e.key === 'Enter') $('pin-bm-save').click(); });
$('popup-backdrop').addEventListener('click', closePinBookmarkForm);

// ── Todos ────────────────────────────────────────────────────

function renderTodos() {
  const list = $('todos-list');
  const active = todos.filter(t => !t.done);
  const done   = todos.filter(t => t.done);
  $('todo-count').textContent = active.length ? `${active.length} active` : '';
  $('clear-done-btn').classList.toggle('hidden', done.length === 0);

  const filtered = todoFilter === 'active' ? active : todoFilter === 'done' ? done : todos;
  if (!filtered.length) {
    list.innerHTML = `<p class="empty-state">No tasks.</p>`;
  } else {
    list.innerHTML = '';
    filtered.forEach(todo => list.appendChild(makeTodoCard(todo)));
  }
  renderActiveStrip();
  renderTasksPopup();
}

function getActiveTasks() {
  const active = todos.filter(t => !t.done);
  active.sort((a, b) => {
    const aRun = a.timer && a.timer.endsAt ? 0 : a.timer ? 1 : 2;
    const bRun = b.timer && b.timer.endsAt ? 0 : b.timer ? 1 : 2;
    return aRun - bRun;
  });
  return active;
}

function renderActiveStrip() {
  const strip = $('active-task-strip');
  const pane = $('todo-pane');
  const list = getActiveTasks();
  if (!list.length) {
    strip.classList.add('hidden');
    pane.classList.remove('has-active');
    strip.innerHTML = '';
    return;
  }
  pane.classList.add('has-active');
  strip.classList.remove('hidden');
  strip.innerHTML = '';
  list.forEach(t => strip.appendChild(makeTodoCard(t)));
}

function makeTodoCard(todo) {
  const card = document.createElement('div');
  card.className = 'todo-card' + (todo.done ? ' done' : '');
  if (todo.timer && todo.timer.endsAt) card.classList.add('timing');
  if (todo.timer && todo.timer.expired) card.classList.add('expired');

  const dot = document.createElement('div');
  dot.className = `priority-dot ${todo.priority || 'low'}`;

  const check = document.createElement('button');
  check.className = 'todo-check';
  check.innerHTML = `<svg viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0e0e10" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  check.addEventListener('click', () => {
    const t = todos.find(t => t.id === todo.id);
    if (t) { t.done = !t.done; saveTodos(); renderTodos(); }
  });

  const body = document.createElement('div');
  body.className = 'todo-body';
  const text = document.createElement('div');
  text.className = 'todo-text';
  text.textContent = todo.text;
  body.appendChild(text);

  if (todo.timer && !todo.done) {
    const tr = document.createElement('div');
    tr.className = 'timer-row';
    const ms = todo.timer.endsAt
      ? Math.max(0, todo.timer.endsAt - Date.now())
      : (todo.timer.remainingMs || 0);
    tr.innerHTML = `
      <span class="timer-display" data-timer-id="${todo.id}">${formatTime(ms)}</span>
      <button class="timer-btn" data-act="toggle" title="${todo.timer.endsAt ? 'Pause' : 'Resume'}">
        <i class="ph ph-${todo.timer.endsAt ? 'pause' : 'play'}"></i>
      </button>
      <button class="timer-btn" data-act="reset" title="Reset"><i class="ph ph-arrow-counter-clockwise"></i></button>
      <button class="timer-btn" data-act="remove" title="Remove timer"><i class="ph ph-x"></i></button>
    `;
    tr.querySelector('[data-act="toggle"]').addEventListener('click', e => {
      e.stopPropagation(); toggleTimer(todo.id);
    });
    tr.querySelector('[data-act="reset"]').addEventListener('click', e => {
      e.stopPropagation(); resetTimer(todo.id);
    });
    tr.querySelector('[data-act="remove"]').addEventListener('click', e => {
      e.stopPropagation(); removeTimer(todo.id);
    });
    body.appendChild(tr);
  }

  let setTimerBtn = null;
  if (!todo.done) {
    setTimerBtn = document.createElement('button');
    setTimerBtn.className = 'todo-timer-btn';
    setTimerBtn.title = todo.timer ? 'Edit timer' : 'Set timer';
    setTimerBtn.innerHTML = `<i class="ph ph-timer"></i>`;
    setTimerBtn.addEventListener('click', e => {
      e.stopPropagation();
      openTimerForm(todo.id);
    });
  }

  const del = document.createElement('button');
  del.className = 'todo-del';
  del.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
  del.addEventListener('click', () => {
    todos = todos.filter(t => t.id !== todo.id);
    saveTodos(); renderTodos();
  });

  card.appendChild(dot);
  card.appendChild(check);
  card.appendChild(body);
  if (setTimerBtn) card.appendChild(setTimerBtn);
  card.appendChild(del);
  return card;
}

// ── Timers ───────────────────────────────────────────────────

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
  saveTodos(); renderTodos();
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
  saveTodos(); renderTodos();
}

function resetTimer(id) {
  const t = todos.find(t => t.id === id);
  if (!t || !t.timer) return;
  t.timer.endsAt = null;
  t.timer.remainingMs = t.timer.durationMs;
  t.timer.expired = false;
  saveTodos(); renderTodos();
}

function removeTimer(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  t.timer = null;
  saveTodos(); renderTodos();
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
  if (mutated) { saveTodos(); renderTodos(); return; }
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

// ── Timer form ───────────────────────────────────────────────

let timerEditId = null;

function openTimerForm(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  closeAllPopups();
  timerEditId = id;
  $('timer-task-name').textContent = t.text;
  $('timer-mins').value = t.timer ? Math.round(t.timer.durationMs / 60000) : '';
  $('timer-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  setTimeout(() => $('timer-mins').focus(), 0);
}
function closeTimerForm() {
  $('timer-form').classList.add('hidden');
  timerEditId = null;
  if (!openCatId) $('popup-backdrop').classList.remove('visible');
}
$('timer-cancel').addEventListener('click', closeTimerForm);
$('popup-backdrop').addEventListener('click', closeTimerForm);
$('popup-backdrop').addEventListener('click', closeNoteForm);
$('popup-backdrop').addEventListener('click', () => closeSettings());
document.querySelectorAll('#timer-form .preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!timerEditId) return;
    const mins = parseInt(btn.dataset.mins, 10);
    startTimerOn(timerEditId, mins);
    closeTimerForm();
  });
});
$('timer-start').addEventListener('click', () => {
  if (!timerEditId) return;
  const mins = parseFloat($('timer-mins').value);
  if (!mins || mins <= 0) { $('timer-mins').focus(); return; }
  startTimerOn(timerEditId, mins);
  closeTimerForm();
});
$('timer-mins').addEventListener('keydown', e => { if (e.key === 'Enter') $('timer-start').click(); });

document.querySelectorAll('.priority-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPriority = btn.dataset.priority;
  });
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    todoFilter = tab.dataset.filter;
    renderTodos();
  });
});

function openTodoForm() {
  closeAllPopups();
  $('todo-text').value = '';
  selectedPriority = 'low';
  document.querySelectorAll('#todo-form .priority-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.priority === 'low');
  });
  $('todo-form').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  setTimeout(() => $('todo-text').focus(), 0);
}
function closeTodoForm() {
  $('todo-form').classList.add('hidden');
  const stillOpen = !$('tasks-popup').classList.contains('hidden');
  if (!openCatId && !stillOpen) $('popup-backdrop').classList.remove('visible');
}
$('add-task-fab').addEventListener('click', openTodoForm);
$('todo-cancel').addEventListener('click', closeTodoForm);
$('todo-save').addEventListener('click', () => {
  const text = $('todo-text').value.trim();
  if (!text) { $('todo-text').focus(); return; }
  todos.unshift({ id: uid(), text, priority: selectedPriority, done: false });
  saveTodos(); renderTodos();
  closeTodoForm();
});
$('todo-text').addEventListener('keydown', e => { if (e.key === 'Enter') $('todo-save').click(); });
$('popup-backdrop').addEventListener('click', closeTodoForm);

// Tasks popup (full list view)
let tasksPopupFilter = 'all';
function openTasksPopup() {
  closeAllPopups();
  $('tasks-popup').classList.remove('hidden');
  $('popup-backdrop').classList.add('visible');
  renderTasksPopup();
}
function closeTasksPopup() {
  $('tasks-popup').classList.add('hidden');
  const stillOpen = !$('todo-form').classList.contains('hidden');
  if (!openCatId && !stillOpen) $('popup-backdrop').classList.remove('visible');
}
function renderTasksPopup() {
  const list = $('tasks-popup-list');
  if (!list || $('tasks-popup').classList.contains('hidden')) return;
  const active = todos.filter(t => !t.done);
  const done   = todos.filter(t => t.done);
  const filtered = tasksPopupFilter === 'active' ? active
                 : tasksPopupFilter === 'done'   ? done
                 : todos;
  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = `<p class="empty-state">No tasks.</p>`;
    return;
  }
  filtered.forEach(t => list.appendChild(makeTodoCard(t)));
}
$('tasks-popup-close').addEventListener('click', closeTasksPopup);
$('tasks-popup-add').addEventListener('click', openTodoForm);
$('popup-backdrop').addEventListener('click', closeTasksPopup);
document.querySelectorAll('#tasks-popup-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#tasks-popup-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    tasksPopupFilter = tab.dataset.popupFilter;
    renderTasksPopup();
  });
});
$('clear-done-btn').addEventListener('click', () => { todos = todos.filter(t => !t.done); saveTodos(); renderTodos(); });

// ── Context menu ─────────────────────────────────────────────

function closeContextMenu() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
    btn.innerHTML = `<i class="ph ph-${item.icon}"></i><span>${escapeHtml(item.label)}</span>`;
    btn.addEventListener('click', () => {
      closeContextMenu();
      item.action();
    });
    menu.appendChild(btn);
  });
  menu.style.left = '0px';
  menu.style.top = '0px';
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const px = Math.min(x, window.innerWidth - rect.width - 8);
  const py = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = px + 'px';
  menu.style.top = py + 'px';
}

document.addEventListener('click', closeContextMenu);
document.addEventListener('scroll', closeContextMenu, true);
window.addEventListener('resize', closeContextMenu);

function setupTodoCollapse() {
  const pane = $('todo-pane');
  const btn = $('todo-collapse-btn');
  const expanded = localStorage.getItem('folio_todo_expanded') === '1';
  pane.classList.toggle('expanded', expanded);
  btn.title = expanded ? 'Collapse' : 'Expand';
  btn.addEventListener('click', () => {
    const isExpanded = pane.classList.toggle('expanded');
    localStorage.setItem('folio_todo_expanded', isExpanded ? '1' : '0');
    btn.title = isExpanded ? 'Collapse' : 'Expand';
  });
}

// ── Todo pane resize ─────────────────────────────────────────

function setupTodoResize() {
  const pane = $('todo-pane');
  const handle = $('todo-resize');

  const saved = parseInt(localStorage.getItem('folio_todo_width') || '0', 10);
  if (saved >= 180) pane.style.width = saved + 'px';

  let startX = 0, startWidth = 0;

  const onMove = e => {
    const dx = startX - e.clientX;
    let w = startWidth + dx;
    w = Math.max(180, Math.min(window.innerWidth - 80, w));
    pane.style.width = w + 'px';
  };
  const onUp = () => {
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    localStorage.setItem('folio_todo_width', String(parseInt(pane.style.width, 10)));
  };

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = pane.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Init ─────────────────────────────────────────────────────

(async () => {
  await setupBackground();
  setupQuote();
  setupSearch();
  setupTodoResize();
  setupTodoCollapse();
  setupNotes();
  setupSettings();
  setupMediaIsland();

  categories = (await store.get('folio_categories')) || [];
  bookmarks  = (await store.get('folio_bookmarks'))  || [];
  todos      = (await store.get('folio_todos'))      || [];
  notes      = (await store.get('folio_notes'))      || [];

  // Migrate old `tag`
  bookmarks = bookmarks.map(b => {
    if (b.tag && !b.categoryId) {
      let cat = categories.find(c => c.name.toLowerCase() === b.tag.toLowerCase());
      if (!cat) {
        cat = { id: uid(), name: b.tag, color: 'gold', icon: 'folder', collapsed: false };
        categories.push(cat);
      }
      return { ...b, categoryId: cat.id, tag: undefined };
    }
    return b;
  });

  // Mark already-expired timers from prior session (no alarm — user wasn't here)
  todos.forEach(t => {
    if (t.timer && t.timer.endsAt && Date.now() >= t.timer.endsAt) {
      t.timer.endsAt = null;
      t.timer.remainingMs = 0;
      t.timer.expired = true;
    }
  });

  renderDock();
  renderTodos();
  renderNotes();
  setInterval(tickTimers, 1000);
})();

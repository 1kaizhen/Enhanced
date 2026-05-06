// Folio — media content script.
// Discovers the primary <video>/<audio> on a page, reports state to the
// service worker, and accepts play/pause/next/prev commands.

(function () {
  if (window.__folioMediaInjected) return;
  window.__folioMediaInjected = true;

  let primary = null;
  let lastSentJson = null;
  let pushTimer = null;

  // Site-specific selectors for skip controls. Generic fallback otherwise.
  const SITE_RULES = {
    'music.youtube.com': {
      next: '.next-button.ytmusic-player-bar, tp-yt-paper-icon-button.next-button',
      prev: '.previous-button.ytmusic-player-bar, tp-yt-paper-icon-button.previous-button',
    },
    'www.youtube.com': {
      next: '.ytp-next-button',
      prev: '.ytp-prev-button',
    },
    'open.spotify.com': {
      next: '[data-testid="control-button-skip-forward"]',
      prev: '[data-testid="control-button-skip-back"]',
    },
    'music.apple.com': {
      next: 'button.next-button, [aria-label="Next"]',
      prev: 'button.previous-button, [aria-label="Previous"]',
    },
    'soundcloud.com': {
      next: '.skipControl__next',
      prev: '.skipControl__previous',
    },
    'www.twitch.tv': {
      next: '',
      prev: '',
    },
  };

  function pickPrimary() {
    const els = Array.from(document.querySelectorAll('video, audio'));
    if (!els.length) return null;
    let best = null, bestScore = -Infinity;
    for (const el of els) {
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      const area = (rect.width || 0) * (rect.height || 0);
      let score = 0;
      if (!el.paused) score += 5;
      if (!el.muted) score += 3;
      if (el.duration && isFinite(el.duration)) score += 1;
      if (el.readyState > 0) score += 0.5;
      score += Math.min(area, 1e6) / 1e5;
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  function getArtwork() {
    const ms = navigator.mediaSession && navigator.mediaSession.metadata;
    if (ms && ms.artwork && ms.artwork.length) {
      let chosen = ms.artwork[0];
      let chosenW = 0;
      for (const a of ms.artwork) {
        const w = parseInt(((a.sizes || '').split('x')[0]) || '0', 10) || 0;
        if (w > chosenW) { chosenW = w; chosen = a; }
      }
      return chosen.src || null;
    }
    const og = document.querySelector('meta[property="og:image"]');
    if (og && og.content) return og.content;
    const link = document.querySelector('link[rel="icon"][sizes], link[rel="icon"], link[rel="shortcut icon"]');
    if (link && link.href) return link.href;
    if (primary && primary.poster) return primary.poster;
    return null;
  }

  function buildState() {
    if (!primary) return null;
    if (primary.duration === 0 && !primary.currentSrc) return null;
    const ms = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (ms && ms.title) || document.title || '';
    return {
      playing: !primary.paused,
      title: title.trim(),
      artist: (ms && ms.artist) || '',
      album: (ms && ms.album) || '',
      artwork: getArtwork(),
      origin: location.hostname,
      duration: isFinite(primary.duration) ? primary.duration : 0,
      currentTime: primary.currentTime || 0,
    };
  }

  function pushState() {
    let state = buildState();
    if (!state || !state.title) state = null;
    const json = state ? JSON.stringify(state) : null;
    if (json === lastSentJson) return;
    lastSentJson = json;
    try {
      chrome.runtime.sendMessage({ type: 'media:state', state }, () => { void chrome.runtime.lastError; });
    } catch (e) { /* extension reloaded */ }
  }

  function schedulePush() {
    if (pushTimer) return;
    pushTimer = setTimeout(() => { pushTimer = null; pushState(); }, 200);
  }

  const ATTACHED = new WeakSet();
  function attach(el) {
    if (ATTACHED.has(el)) return;
    ATTACHED.add(el);
    ['play', 'pause', 'playing', 'loadedmetadata', 'emptied', 'ended', 'volumechange'].forEach(evt => {
      el.addEventListener(evt, () => {
        primary = pickPrimary();
        schedulePush();
      }, { passive: true });
    });
  }

  function rescan() {
    document.querySelectorAll('video, audio').forEach(attach);
    primary = pickPrimary();
    schedulePush();
  }

  function clickIfExists(selector) {
    if (!selector) return false;
    const btn = document.querySelector(selector);
    if (!btn) return false;
    btn.click();
    return true;
  }

  // Observe dynamically-added media elements (SPA sites add them later).
  try {
    const obs = new MutationObserver(() => rescan());
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Periodic refresh — catches MediaSession metadata changes (e.g., next track).
  setInterval(() => { primary = pickPrimary(); pushState(); }, 1500);

  // Initial scan + a delayed retry for late-loading SPAs.
  rescan();
  setTimeout(rescan, 1000);
  setTimeout(rescan, 3000);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === 'media:resync') {
      lastSentJson = null; // force a push even if state appears unchanged
      primary = pickPrimary();
      pushState();
      sendResponse && sendResponse({ ok: true });
      return;
    }
    if (msg.type !== 'media:command') return;
    if (!primary) primary = pickPrimary();
    if (!primary) { sendResponse && sendResponse({ ok: false, reason: 'no media' }); return; }
    const rule = SITE_RULES[location.hostname];
    if (msg.cmd === 'playPause') {
      if (primary.paused) primary.play().catch(() => {});
      else primary.pause();
      schedulePush();
    } else if (msg.cmd === 'next') {
      if (!(rule && clickIfExists(rule.next))) {
        // No generic next for raw video; ignore.
      }
    } else if (msg.cmd === 'previous') {
      if (!(rule && clickIfExists(rule.prev))) {
        try { primary.currentTime = 0; } catch (e) {}
      }
    }
    sendResponse && sendResponse({ ok: true });
  });
})();

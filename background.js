// Orbit — media broker service worker.
// Tracks the currently-audible tab and routes media state + commands
// between content scripts and the newtab page.

let currentMediaTabId = null;
const stateByTab = new Map();

function getCurrentState() {
  if (currentMediaTabId == null) return null;
  return stateByTab.get(currentMediaTabId) || null;
}

function broadcast() {
  const payload = { type: 'media:update', state: getCurrentState(), tabId: currentMediaTabId };
  try {
    chrome.runtime.sendMessage(payload, () => { void chrome.runtime.lastError; });
  } catch (e) { /* no listeners */ }
}

function requestResync(tabId) {
  try {
    chrome.tabs.sendMessage(tabId, { type: 'media:resync' }, () => { void chrome.runtime.lastError; });
  } catch (e) { /* tab gone */ }
}

async function bootstrapFromAudibleTabs() {
  try {
    const audible = await chrome.tabs.query({ audible: true });
    audible.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    if (audible.length) currentMediaTabId = audible[0].id;
    // Also resync any http(s) tab so a paused video still reports its state.
    const all = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const t of all) requestResync(t.id);
  } catch (e) {}
}

// Run on every service-worker wake.
bootstrapFromAudibleTabs();
chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(bootstrapFromAudibleTabs);
chrome.runtime.onInstalled && chrome.runtime.onInstalled.addListener(bootstrapFromAudibleTabs);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.audible === true) {
    currentMediaTabId = tabId;
    requestResync(tabId);
    broadcast();
  }
  if (changeInfo.status === 'complete' && tab && tab.audible) {
    currentMediaTabId = tabId;
    requestResync(tabId);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.audible) {
      currentMediaTabId = tabId;
      requestResync(tabId);
      broadcast();
    }
  } catch (e) {}
});

if (chrome.windows && chrome.windows.onFocusChanged) {
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab && tab.audible) {
        currentMediaTabId = tab.id;
        requestResync(tab.id);
        broadcast();
      }
    } catch (e) {}
  });
}

chrome.tabs.onRemoved.addListener(tabId => {
  const wasCurrent = currentMediaTabId === tabId;
  stateByTab.delete(tabId);
  if (wasCurrent) {
    currentMediaTabId = null;
    // pick another tab still in stateByTab if any
    for (const id of stateByTab.keys()) { currentMediaTabId = id; break; }
    broadcast();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'media:state' && sender.tab) {
    const tabId = sender.tab.id;
    if (msg.state) {
      stateByTab.set(tabId, msg.state);
      // Adopt as current if nothing else is set, or this tab is currently audible.
      if (currentMediaTabId == null || sender.tab.audible) {
        currentMediaTabId = tabId;
      }
      // If the playing tab reports state, prefer it over a paused one.
      if (msg.state.playing) currentMediaTabId = tabId;
    } else {
      stateByTab.delete(tabId);
      if (currentMediaTabId === tabId) {
        currentMediaTabId = null;
        for (const id of stateByTab.keys()) { currentMediaTabId = id; break; }
      }
    }
    broadcast();
    return;
  }

  if (msg.type === 'media:getState') {
    const cur = getCurrentState();
    if (!cur) bootstrapFromAudibleTabs(); // wakes audible tabs to push fresh state
    sendResponse({ state: cur, tabId: currentMediaTabId });
    return true;
  }

  if (msg.type === 'media:command') {
    if (currentMediaTabId != null) {
      try {
        chrome.tabs.sendMessage(currentMediaTabId, { type: 'media:command', cmd: msg.cmd }, () => {
          void chrome.runtime.lastError;
        });
      } catch (e) { /* tab gone */ }
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'media:focus') {
    if (currentMediaTabId != null) {
      chrome.tabs.get(currentMediaTabId, tab => {
        if (chrome.runtime.lastError || !tab) return;
        chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId != null) {
          chrome.windows.update(tab.windowId, { focused: true });
        }
      });
    }
    sendResponse({ ok: true });
    return true;
  }
});

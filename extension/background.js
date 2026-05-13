// AssuredAI extension service worker.
//
// Owns: API calls (so content scripts and the popup share auth), context-menu
// setup, keyboard shortcut handling. Content scripts post messages here; we
// hit the verifier API and reply.

const DEFAULT_API_BASE = 'http://localhost:3030';

chrome.runtime.onInstalled.addListener(async () => {
  // Seed defaults
  const stored = await chrome.storage.sync.get(['apiBase', 'scenario']);
  if (!stored.apiBase) {
    await chrome.storage.sync.set({ apiBase: DEFAULT_API_BASE });
  }
  if (!stored.scenario) {
    await chrome.storage.sync.set({ scenario: 'healthcare' });
  }
  chrome.contextMenus.create({
    id: 'assured-ai-verify-selection',
    title: 'Verify with AssuredAI',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'assured-ai-verify-selection') return;
  if (!info.selectionText || !tab?.id) return;
  const result = await runVerify(info.selectionText);
  await chrome.tabs.sendMessage(tab.id, { type: 'assured-ai/result', payload: result });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'verify_selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const [{ result: selected } = { result: '' }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() ?? '',
  });
  if (!selected || typeof selected !== 'string' || selected.trim().length < 20) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'assured-ai/result',
      payload: { kind: 'error', message: 'Select at least 20 characters to verify.' },
    });
    return;
  }
  const result = await runVerify(selected);
  await chrome.tabs.sendMessage(tab.id, { type: 'assured-ai/result', payload: result });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'assured-ai/verify') {
    runVerify(msg.text).then(sendResponse);
    return true; // async
  }
  if (msg?.type === 'assured-ai/get-settings') {
    chrome.storage.sync.get(['apiBase', 'scenario']).then(sendResponse);
    return true;
  }
  if (msg?.type === 'assured-ai/save-settings') {
    chrome.storage.sync.set(msg.payload).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

async function runVerify(text) {
  const { apiBase, scenario } = await chrome.storage.sync.get(['apiBase', 'scenario']);
  const base = apiBase || DEFAULT_API_BASE;
  try {
    const r = await fetch(`${base}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: scenario || 'healthcare',
        input_mode: 'paste',
        article: text,
      }),
    });
    if (!r.ok) {
      return { kind: 'error', message: `Verifier returned HTTP ${r.status}` };
    }
    return await r.json();
  } catch (err) {
    return {
      kind: 'error',
      message: `Could not reach AssuredAI at ${base}. ${err?.message ?? ''}`,
    };
  }
}

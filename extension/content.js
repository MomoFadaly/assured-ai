// Content script — injects a floating "Verify with AssuredAI" button when
// text is selected on supported sites, and shows the verdict inline.

(function () {
  if (window.__assuredAiInjected) return;
  window.__assuredAiInjected = true;

  let trigger = null;
  let panel = null;

  document.addEventListener('mouseup', handleSelection, true);
  document.addEventListener('keyup', handleSelection, true);
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'assured-ai/result') renderResult(msg.payload);
  });

  function handleSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 20) {
      hideTrigger();
      return;
    }
    showTriggerForSelection(sel, text);
  }

  function showTriggerForSelection(sel, text) {
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.className = 'assured-ai-trigger';
      trigger.type = 'button';
      trigger.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
          <path d="M12 2.2 4 5.1v6.4c0 4.5 3.4 8.7 8 10.3 4.6-1.6 8-5.8 8-10.3V5.1L12 2.2Z" fill="currentColor" />
          <path d="m8 12 2.8 2.8L16 9.6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Verify with AssuredAI</span>
      `;
      trigger.addEventListener('click', () => runVerify(text));
      document.body.appendChild(trigger);
    }
    const top = window.scrollY + rect.bottom + 6;
    const left = window.scrollX + rect.left;
    trigger.style.top = `${top}px`;
    trigger.style.left = `${left}px`;
    trigger.style.display = 'inline-flex';
    trigger.dataset.text = text;
  }

  function hideTrigger() {
    if (trigger) trigger.style.display = 'none';
  }

  async function runVerify(text) {
    if (trigger) trigger.style.display = 'none';
    renderLoading();
    const result = await chrome.runtime.sendMessage({ type: 'assured-ai/verify', text });
    renderResult(result);
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'assured-ai-panel';
    panel.innerHTML = `
      <div class="assured-ai-panel-header">
        <span class="assured-ai-panel-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M12 2.2 4 5.1v6.4c0 4.5 3.4 8.7 8 10.3 4.6-1.6 8-5.8 8-10.3V5.1L12 2.2Z" fill="currentColor" />
            <path d="m8 12 2.8 2.8L16 9.6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <strong>AssuredAI</strong>
        </span>
        <button type="button" class="assured-ai-close" aria-label="Close">×</button>
      </div>
      <div class="assured-ai-panel-body"></div>
    `;
    panel.querySelector('.assured-ai-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    document.body.appendChild(panel);
    return panel;
  }

  function renderLoading() {
    const p = ensurePanel();
    p.style.display = 'block';
    p.querySelector('.assured-ai-panel-body').innerHTML = `
      <div class="assured-ai-loading">
        <span class="assured-ai-spinner"></span>
        <span>Verifying selection…</span>
      </div>
    `;
  }

  function renderResult(result) {
    const p = ensurePanel();
    p.style.display = 'block';
    const body = p.querySelector('.assured-ai-panel-body');
    if (!result) {
      body.innerHTML = `<p class="assured-ai-error">No response from the verifier.</p>`;
      return;
    }
    if (result.kind === 'error') {
      body.innerHTML = `<p class="assured-ai-error">${escapeHtml(result.message || 'Failed.')}</p>`;
      return;
    }
    if (result.kind === 'red_flag_blocked') {
      body.innerHTML = `
        <div class="assured-ai-red-flag">
          <strong>Blocked · ${escapeHtml(result.category || 'red flag')}</strong>
          <pre>${escapeHtml(result.message || '')}</pre>
        </div>
      `;
      return;
    }
    if (result.kind === 'verified') {
      const r = result.report || {};
      const url =
        result.audit_log_id != null
          ? `http://localhost:3030/v/${result.audit_log_id}`
          : null;
      const supported = r.supported_paragraph_count ?? 0;
      const unsourced = r.unsourced_paragraph_count ?? 0;
      const pii = r.pii_input_count ?? 0;
      const inj = r.disclaimer_injected ? 'injected' : 'present';
      const isClean = unsourced === 0 && pii === 0 && !r.disclaimer_injected;
      body.innerHTML = `
        <div class="assured-ai-verdict ${isClean ? 'clean' : 'notes'}">
          ${isClean ? '✓ Clean — ready to publish' : '⚠ Verified with notes'}
        </div>
        <ul class="assured-ai-stats">
          <li><strong>${supported}</strong> supported paragraph${supported === 1 ? '' : 's'}</li>
          ${unsourced > 0 ? `<li><strong>${unsourced}</strong> unsourced — editor review</li>` : ''}
          ${pii > 0 ? `<li><strong>${pii}</strong> PII / PHI redacted</li>` : ''}
          <li>Disclaimer: ${inj}</li>
          ${result.audit_log_id != null ? `<li>Audit #${result.audit_log_id} · ${result.latency_ms ?? 0}ms</li>` : ''}
        </ul>
        ${url ? `<a class="assured-ai-link" href="${url}" target="_blank" rel="noopener noreferrer">View public proof →</a>` : ''}
      `;
      return;
    }
    body.innerHTML = `<p class="assured-ai-error">Unrecognized response.</p>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

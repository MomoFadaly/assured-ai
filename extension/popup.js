const $ = (id) => document.getElementById(id);

async function init() {
  const settings = await chrome.runtime.sendMessage({ type: 'assured-ai/get-settings' });
  $('api-base').value = settings?.apiBase || 'http://localhost:3030';
  const savedSlug = settings?.scenario || 'healthcare';

  // Dynamically load packs from the configured AssuredAI instance.
  // Falls back to the static defaults if the call fails (e.g. CORS or offline).
  try {
    const apiBase = ($('api-base').value || '').replace(/\/$/, '');
    const r = await fetch(`${apiBase}/api/packs`, { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      const select = $('scenario');
      select.innerHTML = '';
      for (const p of data.packs ?? []) {
        const opt = document.createElement('option');
        opt.value = p.slug;
        opt.textContent = p.compliance_framework
          ? `${p.name} · ${p.compliance_framework}`
          : p.name;
        select.appendChild(opt);
      }
      if ([...select.options].some((o) => o.value === savedSlug)) {
        select.value = savedSlug;
      }
    }
  } catch {
    // Static fallback in popup.html.
  }
}

async function verify() {
  const text = $('article').value.trim();
  if (text.length < 20) {
    renderVerdict({ kind: 'error', message: 'Paste at least a few sentences.' });
    return;
  }
  $('verify-btn').disabled = true;
  $('verify-btn').textContent = 'Verifying…';
  renderVerdict(null);
  const result = await chrome.runtime.sendMessage({ type: 'assured-ai/verify', text });
  $('verify-btn').disabled = false;
  $('verify-btn').textContent = 'Verify';
  renderVerdict(result);
}

function renderVerdict(result) {
  const el = $('verdict');
  if (!result) {
    el.innerHTML = '';
    return;
  }
  if (result.kind === 'error') {
    el.innerHTML = `<p class="error">${escapeHtml(result.message || 'Failed.')}</p>`;
    return;
  }
  if (result.kind === 'red_flag_blocked') {
    el.innerHTML = `
      <span class="notes">⚠ Blocked · ${escapeHtml(result.category || 'red flag')}</span>
      <pre>${escapeHtml(result.message || '')}</pre>
    `;
    return;
  }
  if (result.kind === 'verified') {
    const r = result.report || {};
    const supported = r.supported_paragraph_count ?? 0;
    const unsourced = r.unsourced_paragraph_count ?? 0;
    const pii = r.pii_input_count ?? 0;
    const isClean = unsourced === 0 && pii === 0 && !r.disclaimer_injected;
    const url =
      result.audit_log_id != null
        ? `${$('api-base').value || 'http://localhost:3030'}/v/${result.audit_log_id}`
        : null;
    const packLabel = r.pack?.name ? `<li>Pack: ${escapeHtml(r.pack.name)}</li>` : '';
    el.innerHTML = `
      <span class="${isClean ? 'clean' : 'notes'}">${isClean ? '✓ Clean' : '⚠ Verified with notes'}</span>
      <ul>
        ${packLabel}
        <li>${supported} supported paragraph${supported === 1 ? '' : 's'}</li>
        ${unsourced > 0 ? `<li>${unsourced} unsourced — editor review</li>` : ''}
        ${pii > 0 ? `<li>${pii} PII / PHI redacted</li>` : ''}
        <li>Disclaimer: ${r.disclaimer_injected ? 'auto-injected' : 'present'}</li>
        ${result.audit_log_id != null ? `<li>Audit #${result.audit_log_id} · ${result.latency_ms ?? 0}ms</li>` : ''}
      </ul>
      ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">View public proof →</a>` : ''}
    `;
    return;
  }
  el.innerHTML = `<p class="error">Unrecognized response.</p>`;
}

async function saveSettings() {
  const apiBase = $('api-base').value.trim() || 'http://localhost:3030';
  const scenario = $('scenario').value;
  await chrome.runtime.sendMessage({
    type: 'assured-ai/save-settings',
    payload: { apiBase, scenario },
  });
  const btn = $('save-settings');
  const orig = btn.textContent;
  btn.textContent = 'Saved ✓';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
  }, 1200);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  $('verify-btn').addEventListener('click', verify);
  $('save-settings').addEventListener('click', saveSettings);
});

/* global AssuredAIMetaBox, wp */
/**
 * AssuredAI meta-box — vanilla DOM + wp.apiFetch.
 *
 * On click → POST /assuredai/v1/verify-post with the current post id +
 * selected pack. The backend renders + sanitises the post content,
 * forwards to the AssuredAI verifier, persists meta, and returns the
 * scoreboard we render into the side panel.
 *
 * No jQuery, no React — works in the classic editor and inside any
 * iframe context the post-edit screen ends up in.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    const root = $('assuredai-meta-box');
    if (!root) return;
    const postId = parseInt(root.getAttribute('data-post-id') || '0', 10);
    if (!postId) return;

    const button = $('assuredai-verify-button');
    const result = $('assuredai-result');
    const errorEl = $('assuredai-error');
    const packSelect = $('assuredai-pack-select');
    const verdictEl = $('assuredai-verdict');
    const citedEl = $('assuredai-cited-pct');
    const recogEl = $('assuredai-recog-hits');
    const verifiedAtEl = $('assuredai-verified-at');
    const proofLink = $('assuredai-proof-link');

    if (!button || !packSelect) return;

    button.addEventListener('click', function () {
      if (!AssuredAIMetaBox.isConfigured) {
        showError(AssuredAIMetaBox.i18n.noKey);
        return;
      }
      const pack = packSelect.value || AssuredAIMetaBox.defaultPack;
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = AssuredAIMetaBox.i18n.verifying;
      hideError();

      wp.apiFetch({
        path: 'assuredai/v1/verify-post',
        method: 'POST',
        data: { post_id: postId, pack: pack },
      })
        .then(function (res) {
          renderResult(res);
        })
        .catch(function (err) {
          const msg = (err && err.message) || (err && err.code) || 'Unknown error';
          showError(AssuredAIMetaBox.i18n.verifyFailed + ' ' + msg);
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalLabel;
        });
    });

    function renderResult(res) {
      if (!res || !res.ok) {
        showError(AssuredAIMetaBox.i18n.verifyFailed + ' ' + ((res && res.error) || ''));
        return;
      }
      result.hidden = false;
      verdictEl.textContent = res.verdict || '—';
      verdictEl.className = 'assuredai-badge assuredai-badge-' + (res.verdict || 'unknown');
      const score = res.score || {};
      citedEl.textContent = score.cited_pct != null ? score.cited_pct + '%' : '—';
      recogEl.textContent = score.recognizer_hits != null ? String(score.recognizer_hits) : '—';
      verifiedAtEl.textContent = res.verified_at
        ? new Date(res.verified_at).toLocaleString()
        : AssuredAIMetaBox.i18n.never;
      if (res.proof_url) {
        proofLink.href = res.proof_url;
        proofLink.hidden = false;
      } else {
        proofLink.hidden = true;
      }
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }

    function hideError() {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

'use client';

/**
 * Client-only effect: when /audit is loaded with ?id=N, scroll to the
 * matching row and pulse-highlight it for a few seconds. The server-rendered
 * <tr> rows carry data-audit-id attributes for us to find.
 */

import * as React from 'react';

export function AuditDeepLink() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const row = document.querySelector<HTMLElement>(`tr[data-audit-id="${id}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('audit-flash');
    const t = setTimeout(() => row.classList.remove('audit-flash'), 3500);
    return () => clearTimeout(t);
  }, []);

  return null;
}

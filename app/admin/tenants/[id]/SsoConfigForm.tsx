'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Power, PowerOff } from 'lucide-react';

interface SsoConfig {
  id: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_slo_url: string | null;
  idp_x509_cert: string;
  attribute_map: Record<string, string>;
  jit_provisioning: boolean;
  enforce_sso: boolean;
  default_role: 'admin' | 'auditor' | 'operator' | 'customer';
  enabled: boolean;
}

export function SsoConfigForm({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: SsoConfig | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [entityId, setEntityId] = useState(initial?.idp_entity_id ?? '');
  const [ssoUrl, setSsoUrl] = useState(initial?.idp_sso_url ?? '');
  const [sloUrl, setSloUrl] = useState(initial?.idp_slo_url ?? '');
  const [cert, setCert] = useState(initial?.idp_x509_cert ?? '');
  const [jit, setJit] = useState(initial?.jit_provisioning ?? true);
  const [enforce, setEnforce] = useState(initial?.enforce_sso ?? false);
  const [defaultRole, setDefaultRole] = useState<'admin' | 'auditor' | 'operator' | 'customer'>(
    initial?.default_role ?? 'customer',
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        const body = {
          idp_entity_id: entityId.trim(),
          idp_sso_url: ssoUrl.trim(),
          idp_slo_url: sloUrl.trim() || null,
          idp_x509_cert: cert.trim(),
          jit_provisioning: jit,
          enforce_sso: enforce,
          default_role: defaultRole,
          enabled,
        };
        const r = await fetch(`/api/admin/sso/${tenantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  function disable() {
    if (!initial) return;
    setError(null);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/sso/${tenantId}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setEnabled(false);
        setEnforce(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="IdP Entity ID" required>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="https://idp.acme.com/saml/idp"
            className="form-input"
          />
        </Field>
        <Field label="IdP SSO URL (HTTP-POST)" required>
          <input
            value={ssoUrl}
            onChange={(e) => setSsoUrl(e.target.value)}
            placeholder="https://idp.acme.com/saml/sso"
            className="form-input"
          />
        </Field>
        <Field label="IdP SLO URL (optional)">
          <input
            value={sloUrl ?? ''}
            onChange={(e) => setSloUrl(e.target.value)}
            placeholder="https://idp.acme.com/saml/slo"
            className="form-input"
          />
        </Field>
        <Field label="Default role for JIT users">
          <select
            value={defaultRole}
            onChange={(e) =>
              setDefaultRole(e.target.value as 'admin' | 'auditor' | 'operator' | 'customer')
            }
            className="form-input"
          >
            <option value="customer">Customer (chat-only)</option>
            <option value="operator">Operator (editor)</option>
            <option value="auditor">Auditor (read-only)</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>

      <Field
        label="IdP X.509 certificate (PEM)"
        required
        hint="-----BEGIN CERTIFICATE----- … -----END CERTIFICATE-----"
      >
        <textarea
          value={cert}
          onChange={(e) => setCert(e.target.value)}
          rows={6}
          className="form-input font-mono text-[11.5px]"
          placeholder={'-----BEGIN CERTIFICATE-----\nMIID…\n-----END CERTIFICATE-----'}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle
          label="JIT-provision new users"
          checked={jit}
          onChange={setJit}
          hint="Create accounts on first SAML login."
        />
        <Toggle
          label="Enforce SSO"
          checked={enforce}
          onChange={setEnforce}
          hint="Disable password + Google fallback."
        />
        <Toggle
          label="Enabled"
          checked={enabled}
          onChange={setEnabled}
          hint="Turn off to keep config but pause cutover."
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/[0.06] px-3 py-2 text-[12.5px] text-emerald-800 dark:text-emerald-200">
          SSO config saved.
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
        {initial?.enabled ? (
          <button
            type="button"
            onClick={disable}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500/40 bg-red-500/[0.06] px-4 text-[12.5px] font-semibold text-red-700 hover:bg-red-500/[0.1] disabled:opacity-50"
          >
            <PowerOff className="h-3.5 w-3.5" />
            Disable SSO
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Power className="h-3.5 w-3.5" />
            {initial ? 'SSO config saved but disabled.' : 'No SSO config yet.'}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending || !entityId || !ssoUrl || !cert}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save SSO config
        </button>
      </div>

      <style jsx>{`
        :global(.form-input) {
          display: block;
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-size: 13px;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </label>
  );
}
